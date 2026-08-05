import { describe, it, expect, beforeEach } from 'vitest'
import { createTestEnv, apiRequest, seedClient, seedProject } from './helpers.ts'
import type { TestEnv } from './helpers.ts'

describe('clients API', () => {
  let env: TestEnv

  beforeEach(() => {
    env = createTestEnv()
  })

  describe('GET /api/v1/clients', () => {
    it('lists seeded clients', async () => {
      await seedClient(env, { name: 'Acme Corp', code: 'acme' })
      await seedClient(env, { name: 'Globex', code: 'globex' })
      const res = await apiRequest(env, 'GET', '/api/v1/clients')
      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(2)
    })
  })

  describe('POST /api/v1/clients', () => {
    it('creates a client', async () => {
      const res = await apiRequest(env, 'POST', '/api/v1/clients', {
        name: 'Initech',
        code: 'initech',
        billingRate: 175,
      })
      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({ name: 'Initech', code: 'initech', billingRate: 175, isActive: true })
    })

    it('rejects missing required fields', async () => {
      const res = await apiRequest(env, 'POST', '/api/v1/clients', { name: 'No Code' })
      expect(res.status).toBe(400)
    })

    it('rejects invalid code format', async () => {
      const res = await apiRequest(env, 'POST', '/api/v1/clients', { name: 'Bad', code: 'bad code!' })
      expect(res.status).toBe(400)
      expect(res.body.error).toMatch(/alphanumeric/)
    })

    it('returns 409 on duplicate code', async () => {
      await seedClient(env, { name: 'First', code: 'dup' })
      const res = await apiRequest(env, 'POST', '/api/v1/clients', { name: 'Second', code: 'dup' })
      expect(res.status).toBe(409)
    })
  })

  describe('PATCH /api/v1/clients/:id', () => {
    it('updates fields and toggles active state', async () => {
      const client = await seedClient(env)
      const res = await apiRequest(env, 'PATCH', `/api/v1/clients/${client.id}`, {
        billingRate: 200,
        isActive: false,
      })
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ billingRate: 200, isActive: false })
    })

    it('returns 404 for unknown client', async () => {
      const res = await apiRequest(env, 'PATCH', '/api/v1/clients/does-not-exist', { name: 'X' })
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/v1/clients/:id', () => {
    it('soft-deletes a client with no projects', async () => {
      const client = await seedClient(env)
      const res = await apiRequest(env, 'DELETE', `/api/v1/clients/${client.id}`)
      expect(res.status).toBe(200)
      expect(res.body.isActive).toBe(false)
    })

    it('blocks deletion when projects reference the client', async () => {
      const client = await seedClient(env)
      await seedProject(env, client.id)
      const res = await apiRequest(env, 'DELETE', `/api/v1/clients/${client.id}`)
      expect(res.status).toBe(409)
      expect(res.body.error).toMatch(/projects/)
    })

    it('returns 404 for unknown client', async () => {
      const res = await apiRequest(env, 'DELETE', '/api/v1/clients/nope')
      expect(res.status).toBe(404)
    })
  })
})
