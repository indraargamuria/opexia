import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { drizzle } from 'drizzle-orm/d1'
import { desc, eq, and, sql } from 'drizzle-orm'
import * as schema from './db/schema'
import { checksum } from './lib/crypto'
import { isValidClientCode, isUniqueViolation } from './lib/validators'
import { canTransition, isValidDateRange, budgetUtilization, creatableProjectStatuses } from './lib/projects'

const app = new Hono<{ Bindings: { opexai_db: any } }>()

app.use('*', logger())
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

function db(c: any) {
  return drizzle(c.env.opexai_db, { schema })
}

async function projectIsArchived(d: any, projectId: string): Promise<boolean> {
  const project = await d.query.projects.findFirst({
    columns: { status: true },
    where: eq(schema.projects.id, projectId),
  })
  return project?.status === 'archived'
}

// ─── Clients ────────────────────────────────────────────────────────────────

app.get('/api/v1/clients', async (c) => {
  const d = db(c)
  const rows = await d.query.clients.findMany({
    orderBy: [desc(schema.clients.createdAt)],
  })
  return c.json(rows)
})

app.get('/api/v1/clients/:id', async (c) => {
  const d = db(c)
  const row = await d.query.clients.findFirst({
    where: eq(schema.clients.id, c.req.param('id')),
  })
  if (!row) return c.json({ error: 'Client not found' }, 404)
  return c.json(row)
})

app.post('/api/v1/clients', async (c) => {
  const d = db(c)
  const body = await c.req.json()
  if (!body.name || !body.code) {
    return c.json({ error: 'name and code are required' }, 400)
  }
  if (typeof body.code !== 'string' || !isValidClientCode(body.code)) {
    return c.json({ error: 'code must be alphanumeric plus hyphens only' }, 400)
  }
  try {
    const [row] = await d.insert(schema.clients).values({
      name: body.name,
      code: body.code,
      billingRate: body.billingRate,
      currency: body.currency ?? 'USD',
      address: body.address,
      isActive: body.isActive ?? true,
    }).returning()
    return c.json(row, 201)
  } catch (err) {
    if (isUniqueViolation(err)) {
      return c.json({ error: 'A client with this name or code already exists' }, 409)
    }
    throw err
  }
})

app.patch('/api/v1/clients/:id', async (c) => {
  const d = db(c)
  const body = await c.req.json()
  if (body.code !== undefined && (typeof body.code !== 'string' || !isValidClientCode(body.code))) {
    return c.json({ error: 'code must be alphanumeric plus hyphens only' }, 400)
  }
  const patch: Record<string, unknown> = {}
  if (body.name !== undefined) patch.name = body.name
  if (body.code !== undefined) patch.code = body.code
  if (body.billingRate !== undefined) patch.billingRate = body.billingRate
  if (body.currency !== undefined) patch.currency = body.currency
  if (body.address !== undefined) patch.address = body.address
  if (body.isActive !== undefined) patch.isActive = body.isActive
  try {
    const [row] = await d.update(schema.clients)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(schema.clients.id, c.req.param('id')))
      .returning()
    if (!row) return c.json({ error: 'Client not found' }, 404)
    return c.json(row)
  } catch (err) {
    if (isUniqueViolation(err)) {
      return c.json({ error: 'A client with this name or code already exists' }, 409)
    }
    throw err
  }
})

app.delete('/api/v1/clients/:id', async (c) => {
  const d = db(c)
  const id = c.req.param('id')
  const client = await d.query.clients.findFirst({ where: eq(schema.clients.id, id) })
  if (!client) return c.json({ error: 'Client not found' }, 404)
  const [countRow] = await d.select({ count: sql<number>`count(*)` })
    .from(schema.projects)
    .where(eq(schema.projects.clientId, id))
  if (Number(countRow.count) > 0) {
    return c.json({ error: 'Client has associated projects and cannot be deleted' }, 409)
  }
  const [row] = await d.update(schema.clients)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(schema.clients.id, id))
    .returning()
  return c.json(row)
})

// ─── Projects ───────────────────────────────────────────────────────────────

app.get('/api/v1/projects', async (c) => {
  const d = db(c)
  const rows = await d.query.projects.findMany({
    with: { client: true },
    orderBy: [desc(schema.projects.createdAt)],
  })
  const hours = await d.select({
    projectId: schema.timeEntries.projectId,
    total: sql<number>`sum(${schema.timeEntries.durationMinutes})`,
  })
    .from(schema.timeEntries)
    .groupBy(schema.timeEntries.projectId)
  const hoursByProject = new Map(hours.map((h) => [h.projectId, Number(h.total) ?? 0]))
  return c.json(rows.map((row) => {
    const loggedHours = Math.round(((hoursByProject.get(row.id) ?? 0) / 60) * 100) / 100
    return {
      ...row,
      loggedHours,
      budgetUtilization: budgetUtilization(loggedHours, row.budgetHours),
    }
  }))
})

app.get('/api/v1/projects/:id', async (c) => {
  const d = db(c)
  const row = await d.query.projects.findFirst({
    where: eq(schema.projects.id, c.req.param('id')),
    with: { client: true },
  })
  if (!row) return c.json({ error: 'Project not found' }, 404)
  return c.json(row)
})

app.post('/api/v1/projects', async (c) => {
  const d = db(c)
  const body = await c.req.json()
  if (!body.name || !body.code || !body.clientId) {
    return c.json({ error: 'name, code, and clientId are required' }, 400)
  }
  const duplicate = await d.query.projects.findFirst({
    where: and(
      eq(schema.projects.clientId, body.clientId),
      eq(schema.projects.code, body.code),
    ),
  })
  if (duplicate) {
    return c.json({ error: 'A project with this code already exists for the client' }, 409)
  }
  if (body.status !== undefined && !creatableProjectStatuses.includes(body.status)) {
    return c.json({ error: `Cannot create a project in status ${body.status}` }, 400)
  }
  if (!isValidDateRange(body.startDate, body.endDate)) {
    return c.json({ error: 'endDate must be on or after startDate' }, 400)
  }
  const [row] = await d.insert(schema.projects).values({
    clientId: body.clientId,
    name: body.name,
    code: body.code,
    description: body.description,
    status: body.status ?? 'planning',
    budgetHours: body.budgetHours,
    budgetCost: body.budgetCost,
    startDate: body.startDate,
    endDate: body.endDate,
  }).returning()
  return c.json(row, 201)
})

app.patch('/api/v1/projects/:id', async (c) => {
  const d = db(c)
  const id = c.req.param('id')
  const body = await c.req.json()
  const existing = await d.query.projects.findFirst({ where: eq(schema.projects.id, id) })
  if (!existing) return c.json({ error: 'Project not found' }, 404)
  if (body.status !== undefined && body.status !== existing.status) {
    if (!canTransition(existing.status, body.status)) {
      return c.json({ error: `Cannot transition project from ${existing.status} to ${body.status}` }, 400)
    }
  }
  const startDate = body.startDate ?? existing.startDate
  const endDate = body.endDate ?? existing.endDate
  if (!isValidDateRange(startDate, endDate)) {
    return c.json({ error: 'endDate must be on or after startDate' }, 400)
  }
  const patch: Record<string, unknown> = {}
  if (body.name !== undefined) patch.name = body.name
  if (body.code !== undefined) patch.code = body.code
  if (body.description !== undefined) patch.description = body.description
  if (body.status !== undefined) patch.status = body.status
  if (body.budgetHours !== undefined) patch.budgetHours = body.budgetHours
  if (body.budgetCost !== undefined) patch.budgetCost = body.budgetCost
  if (body.startDate !== undefined) patch.startDate = body.startDate
  if (body.endDate !== undefined) patch.endDate = body.endDate
  const [row] = await d.update(schema.projects)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(schema.projects.id, id))
    .returning()
  return c.json(row)
})

app.delete('/api/v1/projects/:id', async (c) => {
  const d = db(c)
  const id = c.req.param('id')
  const project = await d.query.projects.findFirst({ where: eq(schema.projects.id, id) })
  if (!project) return c.json({ error: 'Project not found' }, 404)
  const [entryCount] = await d.select({ count: sql<number>`count(*)` })
    .from(schema.timeEntries)
    .where(eq(schema.timeEntries.projectId, id))
  const [memberCount] = await d.select({ count: sql<number>`count(*)` })
    .from(schema.teamMembers)
    .where(eq(schema.teamMembers.projectId, id))
  if (Number(entryCount.count) > 0 || Number(memberCount.count) > 0) {
    return c.json({ error: 'Project has associated time entries or team members and cannot be deleted' }, 409)
  }
  await d.delete(schema.projects).where(eq(schema.projects.id, id))
  return c.json({ ok: true })
})

// ─── Team Members ───────────────────────────────────────────────────────────

app.get('/api/v1/team-members', async (c) => {
  const d = db(c)
  const rows = await d.query.teamMembers.findMany({
    with: { user: true, project: true },
    orderBy: [desc(schema.teamMembers.assignedAt)],
  })
  return c.json(rows)
})

app.post('/api/v1/team-members', async (c) => {
  const d = db(c)
  const body = await c.req.json()
  if (!body.userId || !body.projectId) {
    return c.json({ error: 'userId and projectId are required' }, 400)
  }
  const [row] = await d.insert(schema.teamMembers).values({
    userId: body.userId,
    projectId: body.projectId,
    role: body.role ?? 'worker',
    billableRate: body.billableRate,
  }).returning()
  return c.json(row, 201)
})

// ─── Tags ───────────────────────────────────────────────────────────────────

app.get('/api/v1/tags', async (c) => {
  const d = db(c)
  const rows = await d.query.tags.findMany({
    orderBy: [desc(schema.tags.createdAt)],
  })
  return c.json(rows)
})

app.post('/api/v1/tags', async (c) => {
  const d = db(c)
  const body = await c.req.json()
  if (!body.name) {
    return c.json({ error: 'name is required' }, 400)
  }
  const [row] = await d.insert(schema.tags).values({
    name: body.name,
    color: body.color,
    erpCode: body.erpCode,
  }).returning()
  return c.json(row, 201)
})

// ─── Time Entries ───────────────────────────────────────────────────────────

app.get('/api/v1/time-entries', async (c) => {
  const d = db(c)
  const rows = await d.query.timeEntries.findMany({
    with: {
      user: true,
      project: { with: { client: true } },
      timeEntryTags: { with: { tag: true } },
    },
    orderBy: [desc(schema.timeEntries.startedAt)],
  })
  return c.json(rows)
})

app.post('/api/v1/time-entries', async (c) => {
  const d = db(c)
  const body = await c.req.json()
  if (!body.userId || !body.projectId) {
    return c.json({ error: 'userId and projectId are required' }, 400)
  }
  if (await projectIsArchived(d, body.projectId)) {
    return c.json({ error: 'Project is archived and cannot accept time entries' }, 400)
  }
  const cs = await checksum(`${body.userId}${body.projectId}${Date.now()}`)
  const [row] = await d.insert(schema.timeEntries).values({
    userId: body.userId,
    projectId: body.projectId,
    description: body.description,
    startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
    endedAt: body.endedAt ? new Date(body.endedAt) : undefined,
    durationMinutes: body.durationMinutes,
    status: 'pending',
    entryMethod: body.entryMethod ?? 'manual',
    checksum: cs,
  }).returning()
  if (body.tagIds?.length) {
    await d.insert(schema.timeEntryTags).values(
      body.tagIds.map((tagId: string) => ({ timeEntryId: row.id, tagId }))
    )
  }
  return c.json(row, 201)
})

// ─── Timer ──────────────────────────────────────────────────────────────────

app.post('/api/v1/timer/start', async (c) => {
  const d = db(c)
  const body = await c.req.json()
  if (!body.userId || !body.projectId) {
    return c.json({ error: 'userId and projectId are required' }, 400)
  }
  if (await projectIsArchived(d, body.projectId)) {
    return c.json({ error: 'Project is archived and cannot accept time entries' }, 400)
  }
  const existing = await d.query.timeEntries.findFirst({
    where: and(
      eq(schema.timeEntries.userId, body.userId),
      eq(schema.timeEntries.status, 'running'),
    ),
  })
  if (existing) {
    return c.json({ error: 'A timer is already running. Stop it first.', activeEntry: existing }, 409)
  }
  const cs = await checksum(`${body.userId}${body.projectId}${Date.now()}`)
  const [row] = await d.insert(schema.timeEntries).values({
    userId: body.userId,
    projectId: body.projectId,
    description: body.description,
    startedAt: new Date(),
    status: 'running',
    entryMethod: 'timer',
    checksum: cs,
  }).returning()
  return c.json(row, 201)
})

app.post('/api/v1/timer/stop', async (c) => {
  const d = db(c)
  const body = await c.req.json()
  if (!body.userId) {
    return c.json({ error: 'userId is required' }, 400)
  }
  const running = await d.query.timeEntries.findFirst({
    where: and(
      eq(schema.timeEntries.userId, body.userId),
      eq(schema.timeEntries.status, 'running'),
    ),
  })
  if (!running) {
    return c.json({ error: 'No active timer found' }, 404)
  }
  const now = new Date()
  const durationMs = now.getTime() - running.startedAt.getTime()
  const durationMinutes = Math.max(1, Math.round(durationMs / 60000))
  const cs = await checksum(`${running.id}${now.getTime()}`)
  const [updated] = await d.update(schema.timeEntries)
    .set({
      endedAt: now,
      durationMinutes,
      status: 'pending',
      checksum: cs,
      updatedAt: now,
    })
    .where(eq(schema.timeEntries.id, running.id))
    .returning()
  return c.json(updated)
})

app.get('/api/v1/timer/current', async (c) => {
  const d = db(c)
  const userId = c.req.query('userId')
  if (!userId) {
    return c.json({ error: 'userId query param is required' }, 400)
  }
  const running = await d.query.timeEntries.findFirst({
    where: and(
      eq(schema.timeEntries.userId, userId),
      eq(schema.timeEntries.status, 'running'),
    ),
    with: {
      project: { with: { client: true } },
      timeEntryTags: { with: { tag: true } },
    },
  })
  return c.json(running ?? null)
})

export type AppType = typeof app

export default app
