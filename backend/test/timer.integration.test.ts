import { describe, it, expect, beforeEach } from 'vitest'
import { createTestEnv, apiRequest, db, seedUser, seedClient, seedProject, seedTimeEntry } from './helpers.ts'
import type { TestEnv } from './helpers.ts'
import * as schema from '../src/db/schema'
import { eq, and } from 'drizzle-orm'

const HOUR = 60 * 60 * 1000

describe('timer API', () => {
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

  describe('single active timer', () => {
    it('blocks a second start with 409', async () => {
      const { user, project } = await baseFixture()
      const first = await apiRequest(env, 'POST', '/api/v1/timer/start', { userId: user.id, projectId: project.id })
      expect(first.status).toBe(201)
      const second = await apiRequest(env, 'POST', '/api/v1/timer/start', { userId: user.id, projectId: project.id })
      expect(second.status).toBe(409)
      expect(second.body.error).toMatch(/already running/i)
    })

    it('auto-stops an overdue timer before allowing a new start', async () => {
      const { user, project } = await baseFixture()
      const overdueStart = new Date(Date.now() - 13 * HOUR)
      const old = await seedTimeEntry(env, project.id, { userId: user.id, status: 'running', startedAt: overdueStart })
      const res = await apiRequest(env, 'POST', '/api/v1/timer/start', { userId: user.id, projectId: project.id })
      expect(res.status).toBe(201)
      const oldNow = await db(env).select().from(schema.timeEntries).where(eq(schema.timeEntries.id, old.id))
      expect(oldNow[0].status).toBe('pending')
      expect(oldNow[0].durationMinutes).toBe(12 * 60)
    })
  })

  describe('stop', () => {
    it('stops a timer and computes duration as pending', async () => {
      const { user, project } = await baseFixture()
      const startedAt = new Date(Date.now() - 95 * 60 * 1000)
      await seedTimeEntry(env, project.id, { userId: user.id, status: 'running', startedAt })
      const res = await apiRequest(env, 'POST', '/api/v1/timer/stop', { userId: user.id })
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('pending')
      expect(res.body.durationMinutes).toBe(95)
      expect(res.body.endedAt).toBeTruthy()
      expect(res.body.checksum).toBeTruthy()
    })

    it('discards sub-minute runs', async () => {
      const { user, project } = await baseFixture()
      const startedAt = new Date(Date.now() - 30 * 1000)
      const entry = await seedTimeEntry(env, project.id, { userId: user.id, status: 'running', startedAt })
      const res = await apiRequest(env, 'POST', '/api/v1/timer/stop', { userId: user.id })
      expect(res.status).toBe(200)
      expect(res.body.discarded).toBe(true)
      const rows = await db(env).select().from(schema.timeEntries).where(eq(schema.timeEntries.id, entry.id))
      expect(rows.length).toBe(0)
    })

    it('returns 404 with no active timer', async () => {
      const user = await seedUser(env)
      const res = await apiRequest(env, 'POST', '/api/v1/timer/stop', { userId: user.id })
      expect(res.status).toBe(404)
    })
  })

  describe('current', () => {
    it('returns null when nothing is running', async () => {
      const user = await seedUser(env)
      const res = await apiRequest(env, 'GET', `/api/v1/timer/current?userId=${user.id}`)
      expect(res.status).toBe(200)
      expect(res.body).toBeNull()
    })

    it('auto-stops an overdue running timer', async () => {
      const { user, project } = await baseFixture()
      const startedAt = new Date(Date.now() - 13 * HOUR)
      const entry = await seedTimeEntry(env, project.id, { userId: user.id, status: 'running', startedAt })
      const res = await apiRequest(env, 'GET', `/api/v1/timer/current?userId=${user.id}`)
      expect(res.status).toBe(200)
      expect(res.body).toBeNull()
      const rows = await db(env).select().from(schema.timeEntries).where(eq(schema.timeEntries.id, entry.id))
      expect(rows[0].status).toBe('pending')
      expect(rows[0].durationMinutes).toBe(720)
    })

    it('returns the running entry with relations', async () => {
      const { user, project } = await baseFixture()
      const entry = await seedTimeEntry(env, project.id, { userId: user.id, status: 'running' })
      const res = await apiRequest(env, 'GET', `/api/v1/timer/current?userId=${user.id}`)
      expect(res.status).toBe(200)
      expect(res.body.id).toBe(entry.id)
      expect(res.body.project.name).toBe(project.name)
    })

    it('requires userId', async () => {
      const res = await apiRequest(env, 'GET', '/api/v1/timer/current')
      expect(res.status).toBe(400)
    })
  })

  describe('entries consistency', () => {
    it('duplicate start leaves exactly one running timer', async () => {
      const { user, project } = await baseFixture()
      await apiRequest(env, 'POST', '/api/v1/timer/start', { userId: user.id, projectId: project.id })
      await apiRequest(env, 'POST', '/api/v1/timer/start', { userId: user.id, projectId: project.id })
      const running = await db(env).select()
        .from(schema.timeEntries)
        .where(and(eq(schema.timeEntries.userId, user.id), eq(schema.timeEntries.status, 'running')))
      expect(running.length).toBe(1)
    })
  })
})
