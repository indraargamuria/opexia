import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { drizzle } from 'drizzle-orm/d1'
import { desc, eq, and, sql, asc, gte, lte, ne, lt, inArray } from 'drizzle-orm'
import * as schema from './db/schema'
import { checksum } from './lib/crypto'
import { isValidClientCode, isUniqueViolation } from './lib/validators'
import { canTransition, isValidDateRange, budgetUtilization, creatableProjectStatuses } from './lib/projects'
import { isValidTeamRole } from './lib/teamMembers'
import { isValidHexColor } from './lib/tags'
import { buildEntryFilters, isFinalized, isWithinEditWindow, reviewBlockReason } from './lib/timeEntries'
import { isOverdue, isUnderMinDuration, maxDurationMinutes } from './lib/timer'
import { weekBounds, utilizationPercent, roundedHours, reportWindow, weeksInWindow, aggregateEntries, costForMinutes, roundMoney, budgetReport, teamUtilizationPercent, WEEKLY_TARGET_HOURS } from './lib/reports'
import { toExportRow, writeXlsxBuffer, createCsvStream } from './lib/exportRows'
import { userRoles, isUserRole, canApprove, canViewAuditLogs, canViewTeamReports, isGlobalAdmin } from './lib/rbac'
import type { UserRole } from './lib/rbac'

type AppEnv = {
  Bindings: { opexai_db: any }
  Variables: { userId?: string; userRole?: UserRole }
}

const app = new Hono<AppEnv>()

app.use('*', logger())
app.use('*', cors({
  origin: ['http://localhost:5700', 'http://127.0.0.1:5700'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
  exposeHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length'],
  credentials: true,
}))

function db(c: any) {
  return drizzle(c.env.opexai_db, { schema })
}

// ─── RBAC (stub auth until Phase 6) ─────────────────────────────────────────
// The client identifies itself with an `X-User-Id` header. The caller's global
// role is resolved from `users.role`. Requests without a resolvable header fall
// back to a stub admin so local tooling keeps working during the stub-auth phase.

const auth = async (c: any, next: () => Promise<void>) => {
  const headerId = c.req.header('x-user-id')
  if (headerId) {
    const d = db(c)
    const user = await d.query.users.findFirst({
      columns: { id: true, role: true },
      where: eq(schema.users.id, headerId),
    })
    if (user && isUserRole(user.role)) {
      c.set('userId', user.id)
      c.set('userRole', user.role)
    }
  }
  if (!c.get('userRole')) {
    c.set('userRole', 'admin')
  }
  await next()
}

const requireRole = (...roles: UserRole[]) => async (c: any, next: () => Promise<void>) => {
  const role: UserRole | undefined = c.get('userRole')
  if (!role || !roles.includes(role)) {
    return c.json({ error: 'Forbidden: insufficient permissions' }, 403)
  }
  await next()
}

const APPROVE_ROLES = userRoles.filter(canApprove)
const AUDIT_ROLES = userRoles.filter(canViewAuditLogs)
const ADMIN_ROLES = userRoles.filter(isGlobalAdmin)
const TEAM_REPORTS_ROLES = userRoles.filter(canViewTeamReports)

app.use('/api/v1/*', auth)

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

app.post('/api/v1/clients', requireRole(...ADMIN_ROLES), async (c) => {
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

app.patch('/api/v1/clients/:id', requireRole(...ADMIN_ROLES), async (c) => {
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

app.delete('/api/v1/clients/:id', requireRole(...ADMIN_ROLES), async (c) => {
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

app.post('/api/v1/projects', requireRole(...ADMIN_ROLES), async (c) => {
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

app.patch('/api/v1/projects/:id', requireRole(...ADMIN_ROLES), async (c) => {
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

app.delete('/api/v1/projects/:id', requireRole(...ADMIN_ROLES), async (c) => {
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

// ─── Users ─────────────────────────────────────────────────────────────────

app.get('/api/v1/users', requireRole(...ADMIN_ROLES), async (c) => {
  const d = db(c)
  const users = await d.query.users.findMany({
    orderBy: [asc(schema.users.name)],
  })
  const agg = await d.select({
    userId: schema.timeEntries.userId,
    minutes: sql<number>`sum(${schema.timeEntries.durationMinutes})`,
  })
    .from(schema.timeEntries)
    .groupBy(schema.timeEntries.userId)
  const loggedByUser = new Map(agg.map((r) => [r.userId, Number(r.minutes) || 0]))
  return c.json(users.map((u) => ({ ...u, loggedMinutes: loggedByUser.get(u.id) ?? 0 })))
})

// ─── Team Members ───────────────────────────────────────────────────────────

app.get('/api/v1/team-members', async (c) => {
  const d = db(c)
  const rows = await d.query.teamMembers.findMany({
    with: { user: true, project: true },
    orderBy: [desc(schema.teamMembers.assignedAt)],
  })
  const agg = await d.select({
    userId: schema.timeEntries.userId,
    projectId: schema.timeEntries.projectId,
    minutes: sql<number>`sum(${schema.timeEntries.durationMinutes})`,
  })
    .from(schema.timeEntries)
    .groupBy(schema.timeEntries.userId, schema.timeEntries.projectId)
  const loggedByAssignment = new Map(agg.map((r) => [`${r.userId}:${r.projectId}`, Number(r.minutes) || 0]))
  return c.json(rows.map((r) => ({ ...r, loggedMinutes: loggedByAssignment.get(`${r.userId}:${r.projectId}`) ?? 0 })))
})

app.get('/api/v1/team-members/:id', async (c) => {
  const d = db(c)
  const row = await d.query.teamMembers.findFirst({
    where: eq(schema.teamMembers.id, c.req.param('id')),
    with: { user: true, project: true },
  })
  if (!row) return c.json({ error: 'Team member assignment not found' }, 404)
  return c.json(row)
})

app.post('/api/v1/team-members', requireRole(...ADMIN_ROLES), async (c) => {
  const d = db(c)
  const body = await c.req.json()
  if (!body.userId || !body.projectId) {
    return c.json({ error: 'userId and projectId are required' }, 400)
  }
  if (body.role !== undefined && !isValidTeamRole(body.role)) {
    return c.json({ error: 'role must be one of worker, manager, admin, viewer' }, 400)
  }
  const [row] = await d.insert(schema.teamMembers).values({
    userId: body.userId,
    projectId: body.projectId,
    role: body.role ?? 'worker',
    billableRate: body.billableRate,
  }).returning()
  return c.json(row, 201)
})

app.patch('/api/v1/team-members/:id', requireRole(...ADMIN_ROLES), async (c) => {
  const d = db(c)
  const body = await c.req.json()
  if (body.role !== undefined && !isValidTeamRole(body.role)) {
    return c.json({ error: 'role must be one of worker, manager, admin, viewer' }, 400)
  }
  const patch: Record<string, unknown> = {}
  if (body.role !== undefined) patch.role = body.role
  if (body.billableRate !== undefined) patch.billableRate = body.billableRate
  if (body.projectId !== undefined) patch.projectId = body.projectId
  const [row] = await d.update(schema.teamMembers)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(schema.teamMembers.id, c.req.param('id')))
    .returning()
  if (!row) return c.json({ error: 'Team member assignment not found' }, 404)
  return c.json(row)
})

app.delete('/api/v1/team-members/:id', requireRole(...ADMIN_ROLES), async (c) => {
  const d = db(c)
  const id = c.req.param('id')
  const existing = await d.query.teamMembers.findFirst({ where: eq(schema.teamMembers.id, id) })
  if (!existing) return c.json({ error: 'Team member assignment not found' }, 404)
  await d.delete(schema.teamMembers).where(eq(schema.teamMembers.id, id))
  return c.json({ ok: true })
})

// ─── Tags ───────────────────────────────────────────────────────────────────

app.get('/api/v1/tags', async (c) => {
  const d = db(c)
  const rows = await d.query.tags.findMany({
    orderBy: [desc(schema.tags.createdAt)],
  })
  const usage = await d.select({
    tagId: schema.timeEntryTags.tagId,
    count: sql<number>`count(*)`,
  })
    .from(schema.timeEntryTags)
    .groupBy(schema.timeEntryTags.tagId)
  const usageByTag = new Map(usage.map((r) => [r.tagId, Number(r.count)]))
  return c.json(rows.map((r) => ({ ...r, usageCount: usageByTag.get(r.id) ?? 0 })))
})

app.get('/api/v1/tags/:id', async (c) => {
  const d = db(c)
  const row = await d.query.tags.findFirst({
    where: eq(schema.tags.id, c.req.param('id')),
  })
  if (!row) return c.json({ error: 'Tag not found' }, 404)
  const [countRow] = await d.select({ count: sql<number>`count(*)` })
    .from(schema.timeEntryTags)
    .where(eq(schema.timeEntryTags.tagId, row.id))
  return c.json({ ...row, usageCount: Number(countRow.count) })
})

app.post('/api/v1/tags', requireRole(...ADMIN_ROLES), async (c) => {
  const d = db(c)
  const body = await c.req.json()
  if (!body.name) {
    return c.json({ error: 'name is required' }, 400)
  }
  if (body.color !== undefined && !isValidHexColor(body.color)) {
    return c.json({ error: 'color must be a 6-digit hex code like #6366f1' }, 400)
  }
  try {
    const [row] = await d.insert(schema.tags).values({
      name: body.name,
      color: body.color,
      category: body.category,
      erpCode: body.erpCode,
    }).returning()
    return c.json(row, 201)
  } catch (err) {
    if (isUniqueViolation(err)) {
      return c.json({ error: 'A tag with this name already exists' }, 409)
    }
    throw err
  }
})

app.patch('/api/v1/tags/:id', requireRole(...ADMIN_ROLES), async (c) => {
  const d = db(c)
  const body = await c.req.json()
  if (body.color !== undefined && !isValidHexColor(body.color)) {
    return c.json({ error: 'color must be a 6-digit hex code like #6366f1' }, 400)
  }
  const patch: Record<string, unknown> = {}
  if (body.name !== undefined) patch.name = body.name
  if (body.color !== undefined) patch.color = body.color
  if (body.category !== undefined) patch.category = body.category
  if (body.erpCode !== undefined) patch.erpCode = body.erpCode
  try {
    const [row] = await d.update(schema.tags)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(schema.tags.id, c.req.param('id')))
      .returning()
    if (!row) return c.json({ error: 'Tag not found' }, 404)
    return c.json(row)
  } catch (err) {
    if (isUniqueViolation(err)) {
      return c.json({ error: 'A tag with this name already exists' }, 409)
    }
    throw err
  }
})

app.delete('/api/v1/tags/:id', requireRole(...ADMIN_ROLES), async (c) => {
  const d = db(c)
  const id = c.req.param('id')
  const tag = await d.query.tags.findFirst({ where: eq(schema.tags.id, id) })
  if (!tag) return c.json({ error: 'Tag not found' }, 404)
  const [invoicedRow] = await d.select({ count: sql<number>`count(*)` })
    .from(schema.timeEntryTags)
    .innerJoin(schema.timeEntries, eq(schema.timeEntryTags.timeEntryId, schema.timeEntries.id))
    .where(and(eq(schema.timeEntryTags.tagId, id), eq(schema.timeEntries.status, 'invoiced')))
  if (Number(invoicedRow.count) > 0) {
    return c.json({ error: 'Tag is used by invoiced time entries and cannot be deleted' }, 409)
  }
  await d.delete(schema.timeEntryTags).where(eq(schema.timeEntryTags.tagId, id))
  await d.delete(schema.tags).where(eq(schema.tags.id, id))
  return c.json({ ok: true })
})

// ─── Time Entries ───────────────────────────────────────────────────────────

app.get('/api/v1/time-entries', async (c) => {
  const d = db(c)
  let filters
  try {
    filters = buildEntryFilters(c.req.query())
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400)
  }
  const conditions = [
    filters.dateFrom ? gte(schema.timeEntries.startedAt, filters.dateFrom) : undefined,
    filters.dateTo ? lte(schema.timeEntries.startedAt, filters.dateTo) : undefined,
    filters.projectId ? eq(schema.timeEntries.projectId, filters.projectId) : undefined,
    filters.status ? eq(schema.timeEntries.status, filters.status) : undefined,
    filters.userId ? eq(schema.timeEntries.userId, filters.userId) : undefined,
  ].filter(Boolean)
  const rows = await d.query.timeEntries.findMany({
    with: {
      user: true,
      project: { with: { client: true } },
      timeEntryTags: { with: { tag: true } },
    },
    where: conditions.length ? and(...conditions) : undefined,
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

async function replaceEntryTags(d: any, timeEntryId: string, tagIds: string[]) {
  await d.delete(schema.timeEntryTags).where(eq(schema.timeEntryTags.timeEntryId, timeEntryId))
  if (tagIds.length) {
    await d.insert(schema.timeEntryTags).values(
      tagIds.map((tagId: string) => ({ timeEntryId, tagId }))
    )
  }
}

app.patch('/api/v1/time-entries/:id', async (c) => {
  const d = db(c)
  const id = c.req.param('id')
  const body = await c.req.json()
  const existing = await d.query.timeEntries.findFirst({ where: eq(schema.timeEntries.id, id) })
  if (!existing) return c.json({ error: 'Time entry not found' }, 404)
  if (existing.status === 'running') {
    return c.json({ error: 'Stop the timer before editing this entry' }, 409)
  }
  if (isFinalized(existing.status)) {
    return c.json({ error: 'Finalized entries (approved/invoiced) are immutable and cannot be edited' }, 409)
  }
  if (existing.status !== 'rejected' && !isWithinEditWindow(existing)) {
    return c.json({ error: 'Entry is outside the editable policy window and requires manager approval' }, 409)
  }
  if (body.projectId !== undefined && await projectIsArchived(d, body.projectId)) {
    return c.json({ error: 'Project is archived and cannot accept time entries' }, 400)
  }
  const patch: Record<string, unknown> = {}
  if (body.projectId !== undefined) patch.projectId = body.projectId
  if (body.description !== undefined) patch.description = body.description
  if (body.startedAt !== undefined) patch.startedAt = new Date(body.startedAt)
  if (body.endedAt !== undefined) patch.endedAt = new Date(body.endedAt)
  if (body.durationMinutes !== undefined) patch.durationMinutes = body.durationMinutes
  if (existing.status === 'rejected') {
    patch.status = 'pending'
    patch.rejectionReason = null
  }
  const updatedAt = new Date()
  const cs = await checksum(`${id}${updatedAt.getTime()}`)
  const [row] = await d.update(schema.timeEntries)
    .set({ ...patch, checksum: cs, updatedAt })
    .where(eq(schema.timeEntries.id, id))
    .returning()
  if (Array.isArray(body.tagIds)) {
    await replaceEntryTags(d, id, body.tagIds)
  }
  return c.json(row)
})

// ─── Approval workflow ──────────────────────────────────────────────────────

async function writeAudit(
  d: any,
  entry: { entityType: string; entityId: string; action: string; actorId: string; payload?: Record<string, unknown> },
) {
  const cs = await checksum(`${entry.entityType}${entry.entityId}${entry.action}${entry.actorId}${Date.now()}`)
  await d.insert(schema.auditLogs).values({
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    actorId: entry.actorId,
    payload: entry.payload ? JSON.stringify(entry.payload) : undefined,
    checksum: cs,
  })
}

app.post('/api/v1/time-entries/:id/approve', requireRole(...APPROVE_ROLES), async (c) => {
  const d = db(c)
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  if (!body.actorId) return c.json({ error: 'actorId is required' }, 400)
  const existing = await d.query.timeEntries.findFirst({ where: eq(schema.timeEntries.id, id) })
  if (!existing) return c.json({ error: 'Time entry not found' }, 404)
  const blocked = reviewBlockReason(existing.status)
  if (blocked) return c.json({ error: blocked }, 409)
  const now = new Date()
  const cs = await checksum(`${id}${now.getTime()}`)
  const [row] = await d.update(schema.timeEntries)
    .set({
      status: 'approved',
      approvedBy: body.actorId,
      approvedAt: now,
      rejectionReason: null,
      checksum: cs,
      updatedAt: now,
    })
    .where(eq(schema.timeEntries.id, id))
    .returning()
  await writeAudit(d, { entityType: 'time_entry', entityId: id, action: 'approved', actorId: body.actorId })
  return c.json(row)
})

app.post('/api/v1/time-entries/:id/reject', requireRole(...APPROVE_ROLES), async (c) => {
  const d = db(c)
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  if (!body.actorId) return c.json({ error: 'actorId is required' }, 400)
  if (!body.rejectionReason || !String(body.rejectionReason).trim()) {
    return c.json({ error: 'rejectionReason is required' }, 400)
  }
  const existing = await d.query.timeEntries.findFirst({ where: eq(schema.timeEntries.id, id) })
  if (!existing) return c.json({ error: 'Time entry not found' }, 404)
  const blocked = reviewBlockReason(existing.status)
  if (blocked) return c.json({ error: blocked }, 409)
  const now = new Date()
  const cs = await checksum(`${id}${now.getTime()}`)
  const [row] = await d.update(schema.timeEntries)
    .set({
      status: 'rejected',
      rejectionReason: String(body.rejectionReason).trim(),
      approvedBy: body.actorId,
      approvedAt: now,
      checksum: cs,
      updatedAt: now,
    })
    .where(eq(schema.timeEntries.id, id))
    .returning()
  await writeAudit(d, { entityType: 'time_entry', entityId: id, action: 'rejected', actorId: body.actorId, payload: { reason: String(body.rejectionReason).trim() } })
  return c.json(row)
})

app.post('/api/v1/time-entries/approve-batch', requireRole(...APPROVE_ROLES), async (c) => {
  const d = db(c)
  const body = await c.req.json().catch(() => ({}))
  if (!body.actorId) return c.json({ error: 'actorId is required' }, 400)
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return c.json({ error: 'ids must be a non-empty array' }, 400)
  }
  const ids = body.ids.map((id: unknown) => String(id))
  const rows = await d.query.timeEntries.findMany({ where: inArray(schema.timeEntries.id, ids) })
  if (rows.length !== ids.length) {
    return c.json({ error: 'One or more time entries were not found' }, 404)
  }
  const approved: unknown[] = []
  const skipped: { id: string; reason: string }[] = []
  for (const entry of rows) {
    const blocked = reviewBlockReason(entry.status)
    if (blocked) {
      skipped.push({ id: entry.id, reason: blocked })
      continue
    }
    const now = new Date()
    const cs = await checksum(`${entry.id}${now.getTime()}`)
    const [row] = await d.update(schema.timeEntries)
      .set({
        status: 'approved',
        approvedBy: body.actorId,
        approvedAt: now,
        rejectionReason: null,
        checksum: cs,
        updatedAt: now,
      })
      .where(eq(schema.timeEntries.id, entry.id))
      .returning()
    approved.push(row)
  }
  return c.json({ approved, skipped })
})

app.get('/api/v1/audit-logs', requireRole(...AUDIT_ROLES), async (c) => {
  const d = db(c)
  const rows = await d.query.auditLogs.findMany({
    with: { actor: true },
    orderBy: [desc(schema.auditLogs.createdAt)],
  })
  return c.json(rows)
})

// ─── Reports ────────────────────────────────────────────────────────────────

app.get('/api/v1/reports/me', async (c) => {
  const d = db(c)
  const userId = c.req.query('userId')
  if (!userId) {
    return c.json({ error: 'userId query param is required' }, 400)
  }
  const { start, end } = weekBounds()
  const [row] = await d.select({
    totalMinutes: sql<number>`coalesce(sum(${schema.timeEntries.durationMinutes}), 0)`,
    projectCount: sql<number>`count(distinct ${schema.timeEntries.projectId})`,
  })
    .from(schema.timeEntries)
    .where(and(
      eq(schema.timeEntries.userId, userId),
      ne(schema.timeEntries.status, 'rejected'),
      gte(schema.timeEntries.startedAt, start),
      lt(schema.timeEntries.startedAt, end),
    ))
  const weeklyTotalMinutes = Number(row?.totalMinutes) || 0
  return c.json({
    userId,
    weekStart: start,
    weekEnd: end,
    weeklyTotalMinutes,
    weeklyTotalHours: roundedHours(weeklyTotalMinutes),
    utilizationPercent: utilizationPercent(weeklyTotalMinutes),
    activeProjects: Number(row?.projectCount) || 0,
  })
})

app.get('/api/v1/reports/project/:id', requireRole(...TEAM_REPORTS_ROLES), async (c) => {
  const d = db(c)
  const id = c.req.param('id')
  const parsed = getReportPeriod(c)
  if (!parsed.ok) return c.json({ error: parsed.error }, 400)
  const period = parsed.period
  const project = await d.query.projects.findFirst({
    where: eq(schema.projects.id, id),
    with: { client: true },
  })
  if (!project) return c.json({ error: 'Project not found' }, 404)

  const scope = and(
    eq(schema.timeEntries.projectId, id),
    ne(schema.timeEntries.status, 'rejected'),
    ne(schema.timeEntries.status, 'running'),
    gte(schema.timeEntries.startedAt, period.start),
    lt(schema.timeEntries.startedAt, period.end),
  )

  const rateRows = await d.select({
    userId: schema.teamMembers.userId,
    rate: schema.teamMembers.billableRate,
  }).from(schema.teamMembers).where(eq(schema.teamMembers.projectId, id))
  const rates = Object.fromEntries(rateRows.map((r) => [r.userId, r.rate]))
  const clientRate = project.client?.billingRate

  const entries = await d.select({
    userId: schema.timeEntries.userId,
    durationMinutes: schema.timeEntries.durationMinutes,
  }).from(schema.timeEntries).where(scope)

  const totals = aggregateEntries(entries, rates, clientRate)

  const tagRows = await d.select({
    userId: schema.timeEntries.userId,
    durationMinutes: schema.timeEntries.durationMinutes,
    tagId: schema.tags.id,
    name: schema.tags.name,
    color: schema.tags.color,
    category: schema.tags.category,
  })
    .from(schema.timeEntryTags)
    .innerJoin(schema.timeEntries, eq(schema.timeEntryTags.timeEntryId, schema.timeEntries.id))
    .innerJoin(schema.tags, eq(schema.timeEntryTags.tagId, schema.tags.id))
    .where(scope)

  const byTagMap = new Map<string, { tagId: string; name: string; color: string | null; category: string | null; minutes: number; count: number; cost: number }>()
  for (const row of tagRows) {
    const minutes = row.durationMinutes ?? 0
    if (minutes <= 0) continue
    const bucket = byTagMap.get(row.tagId) ?? { tagId: row.tagId, name: row.name, color: row.color, category: row.category, minutes: 0, count: 0, cost: 0 }
    bucket.minutes += minutes
    bucket.count += 1
    bucket.cost += costForMinutes(minutes, rates[row.userId] ?? clientRate)
    byTagMap.set(row.tagId, bucket)
  }
  const byTag = [...byTagMap.values()]
    .map((b) => ({ ...b, hours: roundedHours(b.minutes) }))
    .sort((a, b) => b.minutes - a.minutes)

  return c.json({
    projectId: id,
    project: { ...project, client: project.client },
    period: { dateFrom: period.dateFrom, dateTo: period.dateTo },
    totals,
    budget: budgetReport({
      budgetHours: project.budgetHours,
      budgetCost: project.budgetCost,
      loggedHours: totals.hours,
      actualCost: totals.cost,
    }),
    byTag,
  })
})

app.get('/api/v1/reports/client/:id', requireRole(...TEAM_REPORTS_ROLES), async (c) => {
  const d = db(c)
  const id = c.req.param('id')
  const parsed = getReportPeriod(c)
  if (!parsed.ok) return c.json({ error: parsed.error }, 400)
  const period = parsed.period
  const client = await d.query.clients.findFirst({ where: eq(schema.clients.id, id) })
  if (!client) return c.json({ error: 'Client not found' }, 404)

  const projects = await d.query.projects.findMany({ where: eq(schema.projects.clientId, id) })
  const projectIds = projects.map((p) => p.id)

  const entries = projectIds.length > 0
    ? await d.select({
        userId: schema.timeEntries.userId,
        projectId: schema.timeEntries.projectId,
        durationMinutes: schema.timeEntries.durationMinutes,
      }).from(schema.timeEntries).where(and(
        inArray(schema.timeEntries.projectId, projectIds),
        ne(schema.timeEntries.status, 'rejected'),
        ne(schema.timeEntries.status, 'running'),
        gte(schema.timeEntries.startedAt, period.start),
        lt(schema.timeEntries.startedAt, period.end),
      ))
    : []

  const rateRows = projectIds.length > 0
    ? await d.select({
        userId: schema.teamMembers.userId,
        projectId: schema.teamMembers.projectId,
        rate: schema.teamMembers.billableRate,
      }).from(schema.teamMembers).where(inArray(schema.teamMembers.projectId, projectIds))
    : []
  const ratesByProject = new Map<string, Record<string, number | null | undefined>>()
  for (const r of rateRows) {
    const map = ratesByProject.get(r.projectId) ?? {}
    map[r.userId] = r.rate
    ratesByProject.set(r.projectId, map)
  }

  const perProject = new Map<string, { projectId: string; minutes: number; hours: number; count: number; cost: number }>()
  for (const p of projects) {
    perProject.set(p.id, { projectId: p.id, minutes: 0, hours: 0, count: 0, cost: 0 })
  }
  for (const e of entries) {
    const agg = aggregateEntries([e], ratesByProject.get(e.projectId) ?? {}, client.billingRate)
    const bucket = perProject.get(e.projectId)
    if (bucket) {
      bucket.minutes += agg.minutes
      bucket.count += agg.count
      bucket.cost = Math.round((bucket.cost + agg.cost) * 100) / 100
      bucket.hours = roundedHours(bucket.minutes)
    }
  }

  const totals = { minutes: 0, hours: 0, count: 0, cost: 0 }
  for (const b of perProject.values()) {
    totals.minutes += b.minutes
    totals.count += b.count
    totals.cost = roundMoney(totals.cost + b.cost)
  }
  totals.hours = roundedHours(totals.minutes)
  const workerCount = new Set(entries.map((e) => e.userId)).size
  const byProject = projects.map((p) => {
    const b = perProject.get(p.id)!
    return {
      projectId: p.id,
      name: p.name,
      status: p.status,
      minutes: b.minutes,
      hours: b.hours,
      cost: b.cost,
      budgetUtilization: budgetUtilization(b.hours, p.budgetHours),
    }
  })

  return c.json({
    clientId: id,
    client,
    period: { dateFrom: period.dateFrom, dateTo: period.dateTo },
    totals,
    projectCount: projects.length,
    workerCount,
    weeks: weeksInWindow(period.start, period.end),
    utilizationPercent: teamUtilizationPercent(totals.minutes, workerCount, weeksInWindow(period.start, period.end)),
    byProject,
  })
})

app.get('/api/v1/reports/team', requireRole(...TEAM_REPORTS_ROLES), async (c) => {
  const d = db(c)
  const parsed = getReportPeriod(c)
  if (!parsed.ok) return c.json({ error: parsed.error }, 400)
  const period = parsed.period
  const weeks = weeksInWindow(period.start, period.end)

  const entries = await d.select({
    userId: schema.timeEntries.userId,
    projectId: schema.timeEntries.projectId,
    durationMinutes: schema.timeEntries.durationMinutes,
  }).from(schema.timeEntries).where(and(
    ne(schema.timeEntries.status, 'rejected'),
    ne(schema.timeEntries.status, 'running'),
    gte(schema.timeEntries.startedAt, period.start),
    lt(schema.timeEntries.startedAt, period.end),
  ))

  const byUser = new Map<string, { userId: string; minutes: number; count: number; projects: Set<string> }>()
  for (const e of entries) {
    const minutes = e.durationMinutes ?? 0
    if (minutes <= 0) continue
    const bucket = byUser.get(e.userId) ?? { userId: e.userId, minutes: 0, count: 0, projects: new Set<string>() }
    bucket.minutes += minutes
    bucket.count += 1
    bucket.projects.add(e.projectId)
    byUser.set(e.userId, bucket)
  }

  const userIds = [...byUser.keys()]
  const users = userIds.length > 0
    ? await d.select({ id: schema.users.id, name: schema.users.name, email: schema.users.email, role: schema.users.role })
        .from(schema.users)
        .where(inArray(schema.users.id, userIds))
    : []
  const userMap = new Map(users.map((u) => [u.id, u]))

  const members = [...byUser.values()]
    .map((b) => ({
      userId: b.userId,
      name: userMap.get(b.userId)?.name ?? 'Unknown',
      email: userMap.get(b.userId)?.email ?? null,
      role: userMap.get(b.userId)?.role ?? 'worker',
      minutes: b.minutes,
      hours: roundedHours(b.minutes),
      count: b.count,
      projectCount: b.projects.size,
      utilizationPercent: utilizationPercent(b.minutes, WEEKLY_TARGET_HOURS * weeks),
    }))
    .sort((a, b) => b.minutes - a.minutes)

  const teamMinutes = members.reduce((sum, m) => sum + m.minutes, 0)
  const averageUtilization = members.length > 0
    ? Math.round(members.reduce((sum, m) => sum + m.utilizationPercent, 0) / members.length)
    : 0

  return c.json({
    period: { dateFrom: period.dateFrom, dateTo: period.dateTo },
    weeks,
    members,
    teamTotals: {
      minutes: teamMinutes,
      hours: roundedHours(teamMinutes),
      activeWorkerCount: members.length,
      averageUtilizationPercent: averageUtilization,
    },
  })
})

app.get('/api/v1/reports/export', requireRole(...TEAM_REPORTS_ROLES), async (c) => {
  const d = db(c)
  const format = c.req.query('format')
  if (format !== 'xlsx' && format !== 'csv') {
    return c.json({ error: "format must be 'xlsx' or 'csv'" }, 400)
  }
  const parsed = getReportPeriod(c)
  if (!parsed.ok) return c.json({ error: parsed.error }, 400)
  const period = parsed.period

  const entries = await d.select({
    id: schema.timeEntries.id,
    startedAt: schema.timeEntries.startedAt,
    userId: schema.timeEntries.userId,
    projectId: schema.timeEntries.projectId,
    description: schema.timeEntries.description,
    durationMinutes: schema.timeEntries.durationMinutes,
    status: schema.timeEntries.status,
  }).from(schema.timeEntries).where(and(
    ne(schema.timeEntries.status, 'rejected'),
    ne(schema.timeEntries.status, 'running'),
    gte(schema.timeEntries.startedAt, period.start),
    lt(schema.timeEntries.startedAt, period.end),
  ))

  const projectIds = [...new Set(entries.map((e) => e.projectId))]
  const userIds = [...new Set(entries.map((e) => e.userId))]

  const [projects, users, rateRows] = await Promise.all([
    projectIds.length > 0
      ? d.query.projects.findMany({ where: inArray(schema.projects.id, projectIds), with: { client: true } })
      : Promise.resolve([]),
    userIds.length > 0
      ? d.select({ id: schema.users.id, name: schema.users.name }).from(schema.users).where(inArray(schema.users.id, userIds))
      : Promise.resolve([]),
    projectIds.length > 0
      ? d.select({
          userId: schema.teamMembers.userId,
          projectId: schema.teamMembers.projectId,
          rate: schema.teamMembers.billableRate,
        }).from(schema.teamMembers).where(inArray(schema.teamMembers.projectId, projectIds))
      : Promise.resolve([]),
  ])

  const projectMap = new Map(projects.map((p) => [p.id, p]))
  const userMap = new Map(users.map((u) => [u.id, u.name]))
  const ratesByProject = new Map<string, Record<string, number | null | undefined>>()
  for (const r of rateRows) {
    const map = ratesByProject.get(r.projectId) ?? {}
    map[r.userId] = r.rate
    ratesByProject.set(r.projectId, map)
  }

  const entryIds = entries.map((e) => e.id)
  const tagRows = entryIds.length > 0
    ? await d.select({
        timeEntryId: schema.timeEntryTags.timeEntryId,
        name: schema.tags.name,
      }).from(schema.timeEntryTags)
        .innerJoin(schema.tags, eq(schema.timeEntryTags.tagId, schema.tags.id))
        .where(inArray(schema.timeEntryTags.timeEntryId, entryIds))
    : []
  const tagsByEntry = new Map<string, string[]>()
  for (const t of tagRows) {
    const list = tagsByEntry.get(t.timeEntryId) ?? []
    list.push(t.name)
    tagsByEntry.set(t.timeEntryId, list)
  }

  const rows: (string | number)[][] = entries.map((e) => {
    const project = projectMap.get(e.projectId)
    const rate = ratesByProject.get(e.projectId)?.[e.userId] ?? project?.client?.billingRate
    return toExportRow({
      date: e.startedAt,
      worker: userMap.get(e.userId) ?? 'Unknown',
      client: project?.client?.name ?? '',
      project: project?.name ?? 'Unknown',
      description: e.description,
      tags: tagsByEntry.get(e.id) ?? [],
      durationMinutes: e.durationMinutes,
      rate,
      amount: costForMinutes(e.durationMinutes ?? 0, rate),
      status: e.status,
    })
  })
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))

  const filename = `opexia-time-entries-${period.dateFrom}_${period.dateTo}.${format}`
  if (format === 'csv') {
    return new Response(createCsvStream(rows), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  const buffer = writeXlsxBuffer(rows)
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
})

function getReportPeriod(c: any): { ok: true; period: ReturnType<typeof reportWindow> } | { ok: false; error: string } {
  try {
    return { ok: true, period: reportWindow(c.req.query('dateFrom'), c.req.query('dateTo')) }
  } catch (err) {
    if (err instanceof RangeError) {
      return { ok: false, error: err.message }
    }
    throw err
  }
}

// ─── Timer ──────────────────────────────────────────────────────────────────

async function findRunningTimer(d: any, userId: string) {
  return d.query.timeEntries.findFirst({
    where: and(
      eq(schema.timeEntries.userId, userId),
      eq(schema.timeEntries.status, 'running'),
    ),
  })
}

async function autoStopOverdueTimer(d: any, userId: string, now: Date = new Date()) {
  const running = await findRunningTimer(d, userId)
  if (!running) return null
  if (!isOverdue(running.startedAt, now)) return running
  const cs = await checksum(`${running.id}${now.getTime()}`)
  await d.update(schema.timeEntries)
    .set({
      endedAt: now,
      durationMinutes: maxDurationMinutes(),
      status: 'pending',
      checksum: cs,
      updatedAt: now,
    })
    .where(eq(schema.timeEntries.id, running.id))
  return null
}

app.post('/api/v1/timer/start', async (c) => {
  const d = db(c)
  const body = await c.req.json()
  if (!body.userId || !body.projectId) {
    return c.json({ error: 'userId and projectId are required' }, 400)
  }
  if (await projectIsArchived(d, body.projectId)) {
    return c.json({ error: 'Project is archived and cannot accept time entries' }, 400)
  }
  const now = new Date()
  const existing = await autoStopOverdueTimer(d, body.userId, now)
  if (existing) {
    return c.json({ error: 'A timer is already running. Stop it first.', activeEntry: existing }, 409)
  }
  const cs = await checksum(`${body.userId}${body.projectId}${Date.now()}`)
  const [row] = await d.insert(schema.timeEntries).values({
    userId: body.userId,
    projectId: body.projectId,
    description: body.description,
    startedAt: now,
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
  const now = new Date()
  const running = await findRunningTimer(d, body.userId)
  if (!running) {
    return c.json({ error: 'No active timer found' }, 404)
  }
  if (isUnderMinDuration(running.startedAt, now)) {
    await d.delete(schema.timeEntries).where(eq(schema.timeEntries.id, running.id))
    return c.json({ ok: true, discarded: true, id: running.id })
  }
  const durationMinutes = Math.round((now.getTime() - running.startedAt.getTime()) / 60000)
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
  await autoStopOverdueTimer(d, userId)
  const running = await findRunningTimer(d, userId)
  if (!running) return c.json(null)
  return c.json({
    ...running,
    project: await d.query.projects.findFirst({
      where: eq(schema.projects.id, running.projectId),
      with: { client: true },
    }),
    timeEntryTags: await d.query.timeEntryTags.findMany({
      where: eq(schema.timeEntryTags.timeEntryId, running.id),
      with: { tag: true },
    }),
  })
})

export type AppType = typeof app

export default app
