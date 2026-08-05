import { describe, it, expect, beforeEach } from 'vitest'
import { createTestEnv, apiRequest, db, seedUser, seedClient, seedProject, seedTimeEntry } from './helpers.ts'
import type { TestEnv } from './helpers.ts'

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

describe('GET /api/v1/reports/me dashboard aggregation', () => {
  let env: TestEnv

  beforeEach(() => {
    env = createTestEnv()
  })

  async function baseFixture() {
    const user = await seedUser(env)
    const client = await seedClient(env)
    const projectA = await seedProject(env, client.id)
    const projectB = await seedProject(env, client.id)
    return { user, projectA, projectB }
  }

  it('requires a userId query param', async () => {
    const res = await apiRequest(env, 'GET', '/api/v1/reports/me')
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/userId/i)
  })

  it('returns zeros for a user with no entries', async () => {
    const { user } = await baseFixture()
    const res = await apiRequest(env, 'GET', `/api/v1/reports/me?userId=${user.id}`)
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      weeklyTotalMinutes: 0,
      weeklyTotalHours: 0,
      utilizationPercent: 0,
      activeProjects: 0,
    })
  })

  it('aggregates the current week only, excluding rejected entries', async () => {
    const { user, projectA, projectB } = await baseFixture()
    await seedTimeEntry(env, projectA.id, { userId: user.id, durationMinutes: 100, startedAt: new Date() })
    await seedTimeEntry(env, projectB.id, { userId: user.id, durationMinutes: 60, startedAt: new Date() })
    await seedTimeEntry(env, projectA.id, { userId: user.id, durationMinutes: 999, startedAt: daysAgo(10) })
    await seedTimeEntry(env, projectB.id, { userId: user.id, durationMinutes: 500, status: 'rejected', startedAt: new Date() })

    const res = await apiRequest(env, 'GET', `/api/v1/reports/me?userId=${user.id}`)
    expect(res.status).toBe(200)
    expect(res.body.weeklyTotalMinutes).toBe(160)
    expect(res.body.weeklyTotalHours).toBe(2.7)
    expect(res.body.utilizationPercent).toBe(7)
    expect(res.body.activeProjects).toBe(2)
    expect(res.body.userId).toBe(user.id)
  })

  it('counts distinct projects once even with many entries', async () => {
    const { user, projectA, projectB } = await baseFixture()
    await seedTimeEntry(env, projectA.id, { userId: user.id, durationMinutes: 30, startedAt: new Date() })
    await seedTimeEntry(env, projectA.id, { userId: user.id, durationMinutes: 30, startedAt: new Date() })
    await seedTimeEntry(env, projectB.id, { userId: user.id, durationMinutes: 30, startedAt: new Date() })

    const res = await apiRequest(env, 'GET', `/api/v1/reports/me?userId=${user.id}`)
    expect(res.status).toBe(200)
    expect(res.body.weeklyTotalMinutes).toBe(90)
    expect(res.body.activeProjects).toBe(2)
  })

  it('caps utilization at 100%', async () => {
    const { user, projectA, projectB } = await baseFixture()
    await seedTimeEntry(env, projectA.id, { userId: user.id, durationMinutes: 60 * 60, startedAt: new Date() })
    await seedTimeEntry(env, projectB.id, { userId: user.id, durationMinutes: 60, startedAt: new Date() })

    const res = await apiRequest(env, 'GET', `/api/v1/reports/me?userId=${user.id}`)
    expect(res.status).toBe(200)
    expect(res.body.utilizationPercent).toBe(100)
  })
})
