import { describe, it, expect, beforeEach } from 'vitest'
import { createTestEnv, apiRequest, db, seedUser, seedClient, seedProject, seedTimeEntry, seedTeamMember, seedTag, attachTag } from './helpers.ts'
import type { TestEnv } from './helpers.ts'

const JULY_WINDOW = '?dateFrom=2026-07-01&dateTo=2026-07-31'

function asUser(id: string) {
  return { 'X-User-Id': id }
}

async function seedFixture(env: TestEnv) {
  const clientA = await seedClient(env, { name: 'Acme Corp', code: 'acme', billingRate: 150 })
  const clientB = await seedClient(env, { name: 'Beta Inc', code: 'beta', billingRate: 200 })

  const projectA1 = await seedProject(env, clientA.id, { name: 'Alpha', code: 'alp', budgetHours: 100, budgetCost: 10000 })
  const projectA2 = await seedProject(env, clientA.id, { name: 'Delta', code: 'del' })
  const projectB1 = await seedProject(env, clientB.id, { name: 'Gamma', code: 'gam' })

  const bob = await seedUser(env, { name: 'Bob', role: 'worker' })
  const carol = await seedUser(env, { name: 'Carol', role: 'worker' })
  const dave = await seedUser(env, { name: 'Dave', role: 'worker' })

  await seedTeamMember(env, bob.id, projectA1.id, { billableRate: 100 })
  await seedTeamMember(env, carol.id, projectA1.id, { billableRate: 120 })
  await seedTeamMember(env, dave.id, projectA2.id, { billableRate: 90 })

  const tagDev = await seedTag(env, { name: 'Development', category: 'Type' })
  const tagQA = await seedTag(env, { name: 'QA', category: 'Type' })

  const e1 = await seedTimeEntry(env, projectA1.id, { userId: bob.id, durationMinutes: 60, startedAt: new Date(2026, 6, 15, 9), status: 'approved' })
  const e2 = await seedTimeEntry(env, projectA1.id, { userId: carol.id, durationMinutes: 120, startedAt: new Date(2026, 6, 16, 10), status: 'pending' })
  const e3 = await seedTimeEntry(env, projectA1.id, { userId: carol.id, durationMinutes: 30, startedAt: new Date(2026, 6, 17, 11), status: 'approved' })
  await seedTimeEntry(env, projectA1.id, { userId: bob.id, durationMinutes: 45, startedAt: new Date(2026, 6, 18, 12), status: 'rejected' })
  await seedTimeEntry(env, projectA1.id, { userId: bob.id, durationMinutes: 999, startedAt: new Date(2026, 6, 19, 13), status: 'running' })
  await seedTimeEntry(env, projectA1.id, { userId: bob.id, durationMinutes: 60, startedAt: new Date(2026, 5, 20, 9), status: 'pending' })
  await seedTimeEntry(env, projectA2.id, { userId: dave.id, durationMinutes: 90, startedAt: new Date(2026, 6, 15, 9), status: 'pending' })

  await attachTag(env, e1.id, tagDev.id)
  await attachTag(env, e2.id, tagDev.id)
  await attachTag(env, e3.id, tagQA.id)

  return { clientA, clientB, projectA1, projectA2, projectB1, bob, carol, dave, tagDev, tagQA }
}

describe('reports project endpoint', () => {
  let env: TestEnv
  let admin: Awaited<ReturnType<typeof seedUser>>

  beforeEach(async () => {
    env = createTestEnv()
    admin = await seedUser(env, { role: 'admin' })
  })

  it('rolls up hours, cost, budget, and tag breakdown for a project', async () => {
    const { projectA1, tagDev, tagQA } = await seedFixture(env)
    const res = await apiRequest(env, 'GET', `/api/v1/reports/project/${projectA1.id}${JULY_WINDOW}`, undefined, asUser(admin.id))
    expect(res.status).toBe(200)

    expect(res.body.totals).toEqual({ minutes: 210, hours: 3.5, count: 3, cost: 400 })
    expect(res.body.budget).toMatchObject({
      budgetHours: 100,
      budgetCost: 10000,
      loggedHours: 3.5,
      actualCost: 400,
      variance: 9600,
    })
    expect(res.body.budget.utilization.level).toBe('normal')

    const dev = res.body.byTag.find((t: any) => t.tagId === tagDev.id)
    const qa = res.body.byTag.find((t: any) => t.tagId === tagQA.id)
    expect(dev).toMatchObject({ minutes: 180, hours: 3, count: 2, cost: 340 })
    expect(qa).toMatchObject({ minutes: 30, hours: 0.5, count: 1, cost: 60 })
  })

  it('rejects excluded statuses and filters by date window', async () => {
    const { projectA1 } = await seedFixture(env)
    const res = await apiRequest(env, 'GET', `/api/v1/reports/project/${projectA1.id}?dateFrom=2026-06-01&dateTo=2026-07-31`, undefined, asUser(admin.id))
    expect(res.status).toBe(200)
    expect(res.body.totals.minutes).toBe(270)
    expect(res.body.totals.count).toBe(4)

    const onlyJune = await apiRequest(env, 'GET', `/api/v1/reports/project/${projectA1.id}?dateFrom=2026-06-01&dateTo=2026-06-30`, undefined, asUser(admin.id))
    expect(onlyJune.body.totals.minutes).toBe(60)
  })

  it('404s for an unknown project and 400s on an inverted range', async () => {
    const missing = await apiRequest(env, 'GET', '/api/v1/reports/project/nope' + JULY_WINDOW, undefined, asUser(admin.id))
    expect(missing.status).toBe(404)

    const inverted = await apiRequest(env, 'GET', '/api/v1/reports/project/whatever?dateFrom=2026-08-01&dateTo=2026-07-01', undefined, asUser(admin.id))
    expect(inverted.status).toBe(400)
  })

  it('blocks non-manager roles with 403', async () => {
    const { projectA1 } = await seedFixture(env)
    const worker = await seedUser(env, { role: 'worker' })
    const viewer = await seedUser(env, { role: 'viewer' })
    expect((await apiRequest(env, 'GET', `/api/v1/reports/project/${projectA1.id}${JULY_WINDOW}`, undefined, asUser(worker.id))).status).toBe(403)
    expect((await apiRequest(env, 'GET', `/api/v1/reports/project/${projectA1.id}${JULY_WINDOW}`, undefined, asUser(viewer.id))).status).toBe(403)

    const manager = await seedUser(env, { role: 'manager' })
    expect((await apiRequest(env, 'GET', `/api/v1/reports/project/${projectA1.id}${JULY_WINDOW}`, undefined, asUser(manager.id))).status).toBe(200)
  })
})

describe('reports client endpoint', () => {
  let env: TestEnv
  let admin: Awaited<ReturnType<typeof seedUser>>

  beforeEach(async () => {
    env = createTestEnv()
    admin = await seedUser(env, { role: 'admin' })
  })

  it('rolls up totals across all client projects', async () => {
    const { clientA, projectA1, projectA2 } = await seedFixture(env)
    const res = await apiRequest(env, 'GET', `/api/v1/reports/client/${clientA.id}${JULY_WINDOW}`, undefined, asUser(admin.id))
    expect(res.status).toBe(200)

    expect(res.body.totals).toEqual({ minutes: 300, hours: 5, count: 4, cost: 535 })
    expect(res.body.projectCount).toBe(2)
    expect(res.body.workerCount).toBe(3)

    const p1 = res.body.byProject.find((p: any) => p.projectId === projectA1.id)
    const p2 = res.body.byProject.find((p: any) => p.projectId === projectA2.id)
    expect(p1).toMatchObject({ minutes: 210, hours: 3.5, cost: 400 })
    expect(p2).toMatchObject({ minutes: 90, hours: 1.5, cost: 135 })
  })

  it('404s for an unknown client', async () => {
    const res = await apiRequest(env, 'GET', '/api/v1/reports/client/nope' + JULY_WINDOW, undefined, asUser(admin.id))
    expect(res.status).toBe(404)
  })
})

describe('reports team endpoint', () => {
  let env: TestEnv
  let admin: Awaited<ReturnType<typeof seedUser>>

  beforeEach(async () => {
    env = createTestEnv()
    admin = await seedUser(env, { role: 'admin' })
  })

  it('reports per-member utilization sorted by hours, with team totals', async () => {
    const { bob, carol, dave } = await seedFixture(env)
    const res = await apiRequest(env, 'GET', '/api/v1/reports/team' + JULY_WINDOW, undefined, asUser(admin.id))
    expect(res.status).toBe(200)

    expect(res.body.members.map((m: any) => m.userId)).toEqual([carol.id, dave.id, bob.id])

    const carolRow = res.body.members.find((m: any) => m.userId === carol.id)
    const bobRow = res.body.members.find((m: any) => m.userId === bob.id)
    expect(carolRow).toMatchObject({ minutes: 150, hours: 2.5, count: 2, projectCount: 1, utilizationPercent: 2 })
    expect(bobRow).toMatchObject({ minutes: 60, hours: 1, count: 1, projectCount: 1, utilizationPercent: 1 })
    expect(dave).toBeTruthy()

    expect(res.body.teamTotals).toEqual({ minutes: 300, hours: 5, activeWorkerCount: 3, averageUtilizationPercent: 1 })
    expect(res.body.weeks).toBe(4)
  })

  it('excludes rejected and running entries from team totals', async () => {
    const { projectA1 } = await seedFixture(env)
    const fresh = await seedTimeEntry(env, projectA1.id, {
      durationMinutes: 30,
      startedAt: new Date(2026, 6, 20, 9),
      status: 'rejected',
    })
    expect(fresh).toBeTruthy()
    const res = await apiRequest(env, 'GET', '/api/v1/reports/team' + JULY_WINDOW, undefined, asUser(admin.id))
    expect(res.body.teamTotals.minutes).toBe(300)
  })

  it('returns empty member list when nothing is logged in the window', async () => {
    const res = await apiRequest(env, 'GET', '/api/v1/reports/team?dateFrom=2026-01-01&dateTo=2026-01-31', undefined, asUser(admin.id))
    expect(res.status).toBe(200)
    expect(res.body.members).toEqual([])
    expect(res.body.teamTotals.activeWorkerCount).toBe(0)
    expect(res.body.teamTotals.averageUtilizationPercent).toBe(0)
  })
})
