import { describe, it, expect, beforeEach } from 'vitest'
import { createTestEnv, apiRequest, db, seedUser, seedClient, seedProject, seedTimeEntry, seedTag, attachTag } from './helpers.ts'
import type { TestEnv } from './helpers.ts'
import * as schema from '../src/db/schema'
import { eq } from 'drizzle-orm'

describe('time entries editing and filtering API', () => {
  let env: TestEnv

  beforeEach(() => {
    env = createTestEnv()
  })

  async function baseFixture() {
    const user = await seedUser(env)
    const client = await seedClient(env)
    const project = await seedProject(env, client.id)
    return { user, client, project }
  }

  describe('POST /api/v1/time-entries tagging', () => {
    it('attaches tags on create', async () => {
      const { user, project } = await baseFixture()
      const tag = await seedTag(env)
      const res = await apiRequest(env, 'POST', '/api/v1/time-entries', {
        userId: user.id,
        projectId: project.id,
        tagIds: [tag.id],
      })
      expect(res.status).toBe(201)
      const junctions = await db(env).select().from(schema.timeEntryTags).where(eq(schema.timeEntryTags.timeEntryId, res.body.id))
      expect(junctions.length).toBe(1)
      expect(junctions[0].tagId).toBe(tag.id)
    })
  })

  describe('PATCH /api/v1/time-entries/:id', () => {
    it('edits an entry inside the policy window and recomputes checksum', async () => {
      const { user, project } = await baseFixture()
      const entry = await seedTimeEntry(env, project.id, { userId: user.id, description: 'Old', durationMinutes: 30 })
      const res = await apiRequest(env, 'PATCH', `/api/v1/time-entries/${entry.id}`, {
        description: 'New description',
        durationMinutes: 45,
      })
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ description: 'New description', durationMinutes: 45 })
      expect(res.body.checksum).not.toBe(entry.checksum)
    })

    it('rejects edits outside the policy window', async () => {
      const { user, project } = await baseFixture()
      const past = new Date()
      past.setDate(past.getDate() - 10)
      const entry = await seedTimeEntry(env, project.id, { userId: user.id, createdAt: past })
      const res = await apiRequest(env, 'PATCH', `/api/v1/time-entries/${entry.id}`, { description: 'Too late' })
      expect(res.status).toBe(409)
      expect(res.body.error).toMatch(/policy window/i)
    })

    it('rejects edits to finalized entries', async () => {
      const { user, project } = await baseFixture()
      const entry = await seedTimeEntry(env, project.id, { userId: user.id, status: 'approved' })
      const res = await apiRequest(env, 'PATCH', `/api/v1/time-entries/${entry.id}`, { description: 'Nope' })
      expect(res.status).toBe(409)
      expect(res.body.error).toMatch(/immutable/i)
    })

    it('rejects edits to running entries', async () => {
      const { user, project } = await baseFixture()
      const entry = await seedTimeEntry(env, project.id, { userId: user.id, status: 'running' })
      const res = await apiRequest(env, 'PATCH', `/api/v1/time-entries/${entry.id}`, { description: 'Nope' })
      expect(res.status).toBe(409)
    })

    it('replaces tags on update', async () => {
      const { user, project } = await baseFixture()
      const tagA = await seedTag(env, { name: 'a' })
      const tagB = await seedTag(env, { name: 'b' })
      const entry = await seedTimeEntry(env, project.id, { userId: user.id })
      await attachTag(env, entry.id, tagA.id)
      const res = await apiRequest(env, 'PATCH', `/api/v1/time-entries/${entry.id}`, { tagIds: [tagB.id] })
      expect(res.status).toBe(200)
      const junctions = await db(env).select().from(schema.timeEntryTags).where(eq(schema.timeEntryTags.timeEntryId, entry.id))
      expect(junctions.length).toBe(1)
      expect(junctions[0].tagId).toBe(tagB.id)
    })

    it('returns 404 for unknown id', async () => {
      const res = await apiRequest(env, 'PATCH', '/api/v1/time-entries/nope', { description: 'x' })
      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/v1/time-entries filters', () => {
    it('filters by date range', async () => {
      const { user, project } = await baseFixture()
      const inRange = new Date('2026-08-10T10:00:00Z')
      const outOfRange = new Date('2026-01-01T10:00:00Z')
      const a = await seedTimeEntry(env, project.id, { userId: user.id, startedAt: inRange })
      const b = await seedTimeEntry(env, project.id, { userId: user.id, startedAt: outOfRange })
      const res = await apiRequest(env, 'GET', '/api/v1/time-entries?dateFrom=2026-08-01&dateTo=2026-08-31')
      expect(res.status).toBe(200)
      const ids = res.body.map((e: any) => e.id)
      expect(ids).toContain(a.id)
      expect(ids).not.toContain(b.id)
    })

    it('filters by project, status, and user', async () => {
      const { user, project } = await baseFixture()
      const client2 = await seedClient(env, { name: 'Other Co', code: 'other' })
      const project2 = await seedProject(env, client2.id, { name: 'Other', code: 'other-prj' })
      const a = await seedTimeEntry(env, project.id, { userId: user.id, status: 'pending' })
      const b = await seedTimeEntry(env, project2.id, { userId: user.id, status: 'approved' })

      const byProject = await apiRequest(env, 'GET', `/api/v1/time-entries?projectId=${project.id}`)
      expect(byProject.body.map((e: any) => e.id)).toContain(a.id)
      expect(byProject.body.map((e: any) => e.id)).not.toContain(b.id)

      const byStatus = await apiRequest(env, 'GET', '/api/v1/time-entries?status=approved')
      expect(byStatus.body.map((e: any) => e.id)).toContain(b.id)
      expect(byStatus.body.map((e: any) => e.id)).not.toContain(a.id)

      const byUser = await apiRequest(env, 'GET', `/api/v1/time-entries?userId=${user.id}`)
      expect(byUser.body.length).toBe(2)
    })

    it('rejects an invalid status filter', async () => {
      const res = await apiRequest(env, 'GET', '/api/v1/time-entries?status=bogus')
      expect(res.status).toBe(400)
    })
  })
})
