import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { drizzle } from 'drizzle-orm/d1'
import { desc, eq, and } from 'drizzle-orm'
import * as schema from './db/schema'
import { checksum } from './lib/crypto'

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
