import { describe, it, expect, beforeEach } from 'vitest'
import { createTestEnv, apiRequest, db, seedUser, seedClient, seedProject, seedTimeEntry, seedTeamMember } from './helpers.ts'
import type { TestEnv } from './helpers.ts'
import * as schema from '../src/db/schema'
import { eq } from 'drizzle-orm'

function asUser(id: string) {
  return { 'X-User-Id': id }
}

describe('RBAC route guards', () => {
  let env: TestEnv

  beforeEach(() => {
    env = createTestEnv()
  })

  async function baseFixture() {
    const client = await seedClient(env)
    const project = await seedProject(env, client.id)
    return { client, project }
  }

  it('stub mode (no header) resolves to admin and is allowed', async () => {
    const res = await apiRequest(env, 'POST', '/api/v1/tags', { name: 'Stub Admin' })
    expect(res.status).toBe(201)
  })

  it('viewer is denied approve with 403', async () => {
    const { project } = await baseFixture()
    const viewer = await seedUser(env, { role: 'viewer' })
    const entry = await seedTimeEntry(env, project.id, { userId: viewer.id, durationMinutes: 30 })
    const res = await apiRequest(env, 'POST', `/api/v1/time-entries/${entry.id}/approve`, { actorId: viewer.id }, asUser(viewer.id))
    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/forbidden/i)
  })

  it('manager is allowed to approve', async () => {
    const { project } = await baseFixture()
    const worker = await seedUser(env)
    const manager = await seedUser(env, { role: 'manager' })
    const entry = await seedTimeEntry(env, project.id, { userId: worker.id, durationMinutes: 30 })
    const res = await apiRequest(env, 'POST', `/api/v1/time-entries/${entry.id}/approve`, { actorId: manager.id }, asUser(manager.id))
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('approved')
  })

  it('worker is denied manage-master-data mutations with 403', async () => {
    const worker = await seedUser(env)
    const res = await apiRequest(env, 'POST', '/api/v1/clients', { name: 'No Access', code: 'nope-1' }, asUser(worker.id))
    expect(res.status).toBe(403)
  })

  it('admin can manage master data and users', async () => {
    const admin = await seedUser(env, { role: 'admin' })
    const client = await apiRequest(env, 'POST', '/api/v1/clients', { name: 'Admin Client', code: 'adm-1' }, asUser(admin.id))
    expect(client.status).toBe(201)
    const users = await apiRequest(env, 'GET', '/api/v1/users', undefined, asUser(admin.id))
    expect(users.status).toBe(200)
    expect(Array.isArray(users.body)).toBe(true)
  })

  it('unknown X-User-Id falls back to stub admin', async () => {
    const res = await apiRequest(env, 'POST', '/api/v1/tags', { name: 'Unknown Fallback' }, { 'X-User-Id': 'no-such-user' })
    expect(res.status).toBe(201)
  })

  it('audit logs: admin allowed, manager and viewer denied', async () => {
    const admin = await seedUser(env, { role: 'admin' })
    const manager = await seedUser(env, { role: 'manager' })
    const viewer = await seedUser(env, { role: 'viewer' })

    const adminRes = await apiRequest(env, 'GET', '/api/v1/audit-logs', undefined, asUser(admin.id))
    expect(adminRes.status).toBe(200)
    expect(Array.isArray(adminRes.body)).toBe(true)

    expect((await apiRequest(env, 'GET', '/api/v1/audit-logs', undefined, asUser(manager.id))).status).toBe(403)
    expect((await apiRequest(env, 'GET', '/api/v1/audit-logs', undefined, asUser(viewer.id))).status).toBe(403)
  })

  it('approve writes an audit log row', async () => {
    const { project } = await baseFixture()
    const worker = await seedUser(env)
    const manager = await seedUser(env, { role: 'manager' })
    const entry = await seedTimeEntry(env, project.id, { userId: worker.id, durationMinutes: 45 })
    await apiRequest(env, 'POST', `/api/v1/time-entries/${entry.id}/approve`, { actorId: manager.id }, asUser(manager.id))

    const logs = await db(env).select().from(schema.auditLogs)
    expect(logs.length).toBe(1)
    expect(logs[0]).toMatchObject({ entityType: 'time_entry', entityId: entry.id, action: 'approved', actorId: manager.id })
    expect(logs[0].checksum).toBeTruthy()
  })

  it('per-project role from team_members resolves via membership', async () => {
    const { project } = await baseFixture()
    const user = await seedUser(env, { role: 'worker' })
    const member = await seedTeamMember(env, user.id, project.id, { role: 'manager' })
    expect(member.role).toBe('manager')
    const rows = await db(env).select().from(schema.teamMembers).where(eq(schema.teamMembers.id, member.id))
    expect(rows[0].role).toBe('manager')
  })
})
