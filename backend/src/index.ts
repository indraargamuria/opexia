import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { drizzle } from 'drizzle-orm/d1'
import { desc, eq, and, sql } from 'drizzle-orm'
import * as schema from './db/schema'
import { checksum } from './lib/crypto'
import { isValidClientCode, isUniqueViolation } from './lib/validators'

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
  return c.json(rows)
})

app.post('/api/v1/projects', async (c) => {
  const d = db(c)
  const body = await c.req.json()
  if (!body.name || !body.code || !body.clientId) {
    return c.json({ error: 'name, code, and clientId are required' }, 400)
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
