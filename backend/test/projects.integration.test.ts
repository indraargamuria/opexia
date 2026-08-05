import { describe, it, expect, beforeEach } from 'vitest'
import { createTestEnv, apiRequest, seedClient } from './helpers.ts'
import type { TestEnv } from './helpers.ts'

describe('POST /api/v1/projects', () => {
  let env: TestEnv

  beforeEach(() => {
    env = createTestEnv()
  })

  it('creates a project referencing an existing client', async () => {
    const client = await seedClient(env)
    const res = await apiRequest(env, 'POST', '/api/v1/projects', {
      clientId: client.id,
      name: 'Q4 Audit',
      code: 'q4-audit',
      status: 'planning',
      budgetHours: 120,
    })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ name: 'Q4 Audit', code: 'q4-audit', status: 'planning' })

    const list = await apiRequest(env, 'GET', '/api/v1/projects')
    expect(list.body).toHaveLength(1)
    expect(list.body[0].client.id).toBe(client.id)
  })

  it('rejects a project missing required fields', async () => {
    const res = await apiRequest(env, 'POST', '/api/v1/projects', { name: 'No Code' })
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })
})
