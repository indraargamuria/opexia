import { describe, it, expect, beforeEach } from 'vitest'
import { createTestEnv, apiRequest, db, seedUser, seedClient, seedProject, seedTimeEntry } from './helpers.ts'
import type { TestEnv } from './helpers.ts'
import * as schema from '../src/db/schema'
import { eq } from 'drizzle-orm'

describe('approval workflow API', () => {
  let env: TestEnv
  let manager: { id: string }

  beforeEach(async () => {
    env = createTestEnv()
    manager = await seedUser(env, { email: 'manager@example.com' })
  })

  async function baseFixture() {
    const user = await seedUser(env, { email: 'worker@example.com' })
    const client = await seedClient(env)
    const project = await seedProject(env, client.id)
    return { user, project }
  }

  async function pendingEntry(projectId: string, userId?: string) {
    const id = userId ?? (await seedUser(env)).id
    return seedTimeEntry(env, projectId, { userId: id, durationMinutes: 60 })
  }

  it('requires actorId and reason', async () => {
    const { project } = await baseFixture()
    const entry = await pendingEntry(project.id)
    expect((await apiRequest(env, 'POST', `/api/v1/time-entries/${entry.id}/approve`, {})).status).toBe(400)
    expect((await apiRequest(env, 'POST', `/api/v1/time-entries/${entry.id}/approve`, { actorId: manager.id })).status).toBe(200)
  })

  it('reject requires rejectionReason', async () => {
    const { project } = await baseFixture()
    const entry = await pendingEntry(project.id)
    const noReason = await apiRequest(env, 'POST', `/api/v1/time-entries/${entry.id}/reject`, { actorId: manager.id })
    expect(noReason.status).toBe(400)
    const ok = await apiRequest(env, 'POST', `/api/v1/time-entries/${entry.id}/reject`, { actorId: manager.id, rejectionReason: 'Incorrect hours' })
    expect(ok.status).toBe(200)
    expect(ok.body).toMatchObject({ status: 'rejected', rejectionReason: 'Incorrect hours', approvedBy: manager.id })
  })

  it('approve transitions pending to approved and records the approver', async () => {
    const { project } = await baseFixture()
    const entry = await pendingEntry(project.id)
    const res = await apiRequest(env, 'POST', `/api/v1/time-entries/${entry.id}/approve`, { actorId: manager.id })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'approved', approvedBy: manager.id })
    expect(res.body.approvedAt).toBeTruthy()
    const [row] = await db(env).select().from(schema.timeEntries).where(eq(schema.timeEntries.id, entry.id))
    expect(row.checksum).not.toBe(entry.checksum)
  })

  it('blocks review of running, finalized, and rejected entries', async () => {
    const { project } = await baseFixture()
    const running = await seedTimeEntry(env, project.id, { status: 'running', durationMinutes: null })
    const approved = await seedTimeEntry(env, project.id, { status: 'approved' })
    const rejected = await seedTimeEntry(env, project.id, { status: 'rejected' })
    expect((await apiRequest(env, 'POST', `/api/v1/time-entries/${running.id}/approve`, { actorId: manager.id })).status).toBe(409)
    expect((await apiRequest(env, 'POST', `/api/v1/time-entries/${approved.id}/reject`, { actorId: manager.id, rejectionReason: 'nope' })).status).toBe(409)
    expect((await apiRequest(env, 'POST', `/api/v1/time-entries/${rejected.id}/approve`, { actorId: manager.id })).status).toBe(409)
  })

  it('404 on unknown entry', async () => {
    const res = await apiRequest(env, 'POST', '/api/v1/time-entries/nope/approve', { actorId: manager.id })
    expect(res.status).toBe(404)
  })

  it('editing a rejected entry resubmits it as pending and clears the reason', async () => {
    const { project } = await baseFixture()
    const entry = await seedTimeEntry(env, project.id, {
      status: 'rejected',
      rejectionReason: 'Fix description',
      durationMinutes: 60,
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    })
    const res = await apiRequest(env, 'PATCH', `/api/v1/time-entries/${entry.id}`, { description: 'Fixed' })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'pending', description: 'Fixed' })
    expect(res.body.rejectionReason).toBeNull()
  })

  it('resubmitting clears the rejection reason in the DB', async () => {
    const { project } = await baseFixture()
    const entry = await seedTimeEntry(env, project.id, { status: 'rejected', rejectionReason: 'Fix it', durationMinutes: 60 })
    await apiRequest(env, 'PATCH', `/api/v1/time-entries/${entry.id}`, { description: 'Updated' })
    const [row] = await db(env).select().from(schema.timeEntries).where(eq(schema.timeEntries.id, entry.id))
    expect(row.status).toBe('pending')
    expect(row.rejectionReason).toBeNull()
  })

  it('full workflow: submit → reject with note → edit → resubmit → approve → locked', async () => {
    const { user, project } = await baseFixture()
    const entry = await seedTimeEntry(env, project.id, { userId: user.id, durationMinutes: 45 })

    const rejected = await apiRequest(env, 'POST', `/api/v1/time-entries/${entry.id}/reject`, { actorId: manager.id, rejectionReason: 'Rounding error' })
    expect(rejected.body.status).toBe('rejected')

    const edited = await apiRequest(env, 'PATCH', `/api/v1/time-entries/${entry.id}`, { durationMinutes: 50 })
    expect(edited.body).toMatchObject({ status: 'pending', durationMinutes: 50 })

    const approved = await apiRequest(env, 'POST', `/api/v1/time-entries/${entry.id}/approve`, { actorId: manager.id })
    expect(approved.body.status).toBe('approved')

    const locked = await apiRequest(env, 'PATCH', `/api/v1/time-entries/${entry.id}`, { description: 'Too late' })
    expect(locked.status).toBe(409)
  })

  it('approve-batch validates inputs and 404s on unknown ids', async () => {
    const badIds = await apiRequest(env, 'POST', '/api/v1/time-entries/approve-batch', { actorId: manager.id })
    expect(badIds.status).toBe(400)
    const noActor = await apiRequest(env, 'POST', '/api/v1/time-entries/approve-batch', { ids: ['x'] })
    expect(noActor.status).toBe(400)
    const unknown = await apiRequest(env, 'POST', '/api/v1/time-entries/approve-batch', { actorId: manager.id, ids: ['missing-1'] })
    expect(unknown.status).toBe(404)
  })

  it('approve-batch approves pending entries and reports skipped ones', async () => {
    const { user, project } = await baseFixture()
    const entryA = await pendingEntry(project.id, user.id)
    const entryB = await pendingEntry(project.id, user.id)
    const approved = await seedTimeEntry(env, project.id, { status: 'approved' })

    const res = await apiRequest(env, 'POST', '/api/v1/time-entries/approve-batch', {
      actorId: manager.id,
      ids: [entryA.id, entryB.id, approved.id],
    })
    expect(res.status).toBe(200)
    expect(res.body.approved.length).toBe(2)
    expect(res.body.approved.every((e: any) => e.status === 'approved')).toBe(true)
    expect(res.body.skipped.length).toBe(1)
    expect(res.body.skipped[0].id).toBe(approved.id)
    expect(res.body.skipped[0].reason).toMatch(/finalized/i)

    const [row] = await db(env).select().from(schema.timeEntries).where(eq(schema.timeEntries.id, entryA.id))
    expect(row.status).toBe('approved')
    expect(row.approvedBy).toBe(manager.id)
  })
})
