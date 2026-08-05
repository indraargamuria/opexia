import { describe, it, expect, beforeEach } from 'vitest'
import { createTestEnv, apiRequest, seedClient, seedProject, seedUser, seedTimeEntry } from './helpers.ts'
import type { TestEnv } from './helpers.ts'

describe('projects management API', () => {
  let env: TestEnv

  beforeEach(() => {
    env = createTestEnv()
  })

  describe('GET /api/v1/projects/:id', () => {
    it('returns a single project with its client', async () => {
      const client = await seedClient(env)
      const project = await seedProject(env, client.id)
      const res = await apiRequest(env, 'GET', `/api/v1/projects/${project.id}`)
      expect(res.status).toBe(200)
      expect(res.body.client.id).toBe(client.id)
    })

    it('returns 404 for unknown project', async () => {
      const res = await apiRequest(env, 'GET', '/api/v1/projects/nope')
      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/v1/projects', () => {
    it('includes loggedHours and budgetUtilization', async () => {
      const client = await seedClient(env)
      const project = await seedProject(env, client.id, { budgetHours: 100 })
      await seedTimeEntry(env, project.id, { durationMinutes: 1500 })
      const res = await apiRequest(env, 'GET', '/api/v1/projects')
      expect(res.status).toBe(200)
      expect(res.body[0]).toMatchObject({ loggedHours: 25, budgetUtilization: { percentage: 25, level: 'normal' } })
    })
  })

  describe('POST /api/v1/projects', () => {
    it('rejects duplicate code per client', async () => {
      const client = await seedClient(env)
      await seedProject(env, client.id, { code: 'dup' })
      const res = await apiRequest(env, 'POST', '/api/v1/projects', {
        clientId: client.id,
        name: 'Another',
        code: 'dup',
      })
      expect(res.status).toBe(409)
    })

    it('rejects invalid initial status', async () => {
      const client = await seedClient(env)
      const res = await apiRequest(env, 'POST', '/api/v1/projects', {
        clientId: client.id,
        name: 'X',
        code: 'x',
        status: 'archived',
      })
      expect(res.status).toBe(400)
    })

    it('rejects end date before start date', async () => {
      const client = await seedClient(env)
      const res = await apiRequest(env, 'POST', '/api/v1/projects', {
        clientId: client.id,
        name: 'X',
        code: 'x',
        startDate: '2026-02-01',
        endDate: '2026-01-01',
      })
      expect(res.status).toBe(400)
    })
  })

  describe('PATCH /api/v1/projects/:id', () => {
    it('transitions status along the allowed path', async () => {
      const client = await seedClient(env)
      const project = await seedProject(env, client.id, { status: 'active' })
      const res = await apiRequest(env, 'PATCH', `/api/v1/projects/${project.id}`, { status: 'completed' })
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('completed')
    })

    it('rejects an invalid status transition', async () => {
      const client = await seedClient(env)
      const project = await seedProject(env, client.id, { status: 'archived' })
      const res = await apiRequest(env, 'PATCH', `/api/v1/projects/${project.id}`, { status: 'active' })
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/cannot transition/i)
    })

    it('rejects end date before start date', async () => {
      const client = await seedClient(env)
      const project = await seedProject(env, client.id, { startDate: '2026-01-01' })
      const res = await apiRequest(env, 'PATCH', `/api/v1/projects/${project.id}`, { endDate: '2025-12-01' })
      expect(res.status).toBe(400)
    })
  })

  describe('DELETE /api/v1/projects/:id', () => {
    it('deletes a project with no references', async () => {
      const client = await seedClient(env)
      const project = await seedProject(env, client.id)
      const res = await apiRequest(env, 'DELETE', `/api/v1/projects/${project.id}`)
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
      const missing = await apiRequest(env, 'GET', `/api/v1/projects/${project.id}`)
      expect(missing.status).toBe(404)
    })

    it('blocks deletion when time entries exist', async () => {
      const client = await seedClient(env)
      const project = await seedProject(env, client.id)
      await seedTimeEntry(env, project.id)
      const res = await apiRequest(env, 'DELETE', `/api/v1/projects/${project.id}`)
      expect(res.status).toBe(409)
    })
  })

  describe('archived project guard', () => {
    it('blocks timer start on an archived project', async () => {
      const client = await seedClient(env)
      const project = await seedProject(env, client.id, { status: 'archived' })
      const user = await seedUser(env)
      const res = await apiRequest(env, 'POST', '/api/v1/timer/start', { userId: user.id, projectId: project.id })
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/archived/)
    })

    it('blocks manual entry on an archived project', async () => {
      const client = await seedClient(env)
      const project = await seedProject(env, client.id, { status: 'archived' })
      const user = await seedUser(env)
      const res = await apiRequest(env, 'POST', '/api/v1/time-entries', { userId: user.id, projectId: project.id })
      expect(res.status).toBe(400)
    })
  })
})
