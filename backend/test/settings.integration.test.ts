import { describe, it, expect, beforeEach } from 'vitest'
import { eq } from 'drizzle-orm'
import { createTestEnv, apiRequest, db, seedUser, seedClient, seedProject, seedTimeEntry } from './helpers.ts'
import type { TestEnv } from './helpers.ts'
import * as schema from '../src/db/schema.ts'

function asUser(id: string) {
  return { 'X-User-Id': id }
}

describe('settings endpoints', () => {
  let env: TestEnv
  let admin: Awaited<ReturnType<typeof seedUser>>
  let worker: Awaited<ReturnType<typeof seedUser>>

  beforeEach(async () => {
    env = createTestEnv()
    admin = await seedUser(env, { role: 'admin' })
    worker = await seedUser(env, { role: 'worker' })
  })

  it('GET workspace returns the seeded singleton row', async () => {
    const res = await apiRequest(env, 'GET', '/api/v1/workspace', undefined, asUser(admin.id))
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      id: 'singleton',
      name: 'Opexia Consulting',
      slug: 'opexia-consulting',
      currency: 'USD',
      timezone: 'UTC',
    })
  })

  it('PATCH workspace updates fields and persists across requests', async () => {
    const res = await apiRequest(env, 'PATCH', '/api/v1/workspace', {
      name: 'Acme Consulting',
      slug: 'acme-consulting',
      currency: 'EUR',
      timezone: 'Europe/Berlin',
    }, asUser(admin.id))
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ name: 'Acme Consulting', slug: 'acme-consulting', currency: 'EUR', timezone: 'Europe/Berlin' })

    const again = await apiRequest(env, 'GET', '/api/v1/workspace', undefined, asUser(admin.id))
    expect(again.body.name).toBe('Acme Consulting')
    expect(again.body.currency).toBe('EUR')
  })

  it('rejects invalid workspace values and blocks non-admins', async () => {
    const badSlug = await apiRequest(env, 'PATCH', '/api/v1/workspace', { slug: 'Not A Slug!' }, asUser(admin.id))
    expect(badSlug.status).toBe(400)

    const badCurrency = await apiRequest(env, 'PATCH', '/api/v1/workspace', { currency: 'usd' }, asUser(admin.id))
    expect(badCurrency.status).toBe(400)

    const badTz = await apiRequest(env, 'PATCH', '/api/v1/workspace', { timezone: 'Not/AZone' }, asUser(admin.id))
    expect(badTz.status).toBe(400)

    const forbidden = await apiRequest(env, 'PATCH', '/api/v1/workspace', { name: 'Nope' }, asUser(worker.id))
    expect(forbidden.status).toBe(403)
  })

  it('GET/PATCH approval policy with constraint checks', async () => {
    const got = await apiRequest(env, 'GET', '/api/v1/approval-policy', undefined, asUser(admin.id))
    expect(got.body).toMatchObject({ approvalLevel: 'all', manualEntryWindowDays: 7, maxTimerHours: 12 })

    const patched = await apiRequest(env, 'PATCH', '/api/v1/approval-policy', {
      approvalLevel: 'billable',
      manualEntryWindowDays: 3,
      maxTimerHours: 24,
    }, asUser(admin.id))
    expect(patched.status).toBe(200)
    expect(patched.body).toMatchObject({ approvalLevel: 'billable', manualEntryWindowDays: 3, maxTimerHours: 24 })

    const overLimit = await apiRequest(env, 'PATCH', '/api/v1/approval-policy', { maxTimerHours: 25 }, asUser(admin.id))
    expect(overLimit.status).toBe(400)

    const badLevel = await apiRequest(env, 'PATCH', '/api/v1/approval-policy', { approvalLevel: 'everything' }, asUser(admin.id))
    expect(badLevel.status).toBe(400)
  })

  it('GET/PATCH erp config', async () => {
    const got = await apiRequest(env, 'GET', '/api/v1/erp-config', undefined, asUser(admin.id))
    expect(got.body).toMatchObject({ exportFormat: 'sap', costCenterMappingEnabled: true })

    const patched = await apiRequest(env, 'PATCH', '/api/v1/erp-config', { exportFormat: 'oracle', costCenterMappingEnabled: false }, asUser(admin.id))
    expect(patched.status).toBe(200)
    expect(patched.body).toMatchObject({ exportFormat: 'oracle', costCenterMappingEnabled: false })

    const badFormat = await apiRequest(env, 'PATCH', '/api/v1/erp-config', { exportFormat: 'pdf' }, asUser(admin.id))
    expect(badFormat.status).toBe(400)
  })

  it('DELETE workspace wipes data and reseeds settings', async () => {
    const client = await seedClient(env)
    await seedProject(env, client.id)
    expect(await db(env).query.clients.findMany()).toHaveLength(1)

    const res = await apiRequest(env, 'DELETE', '/api/v1/workspace', undefined, asUser(admin.id))
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    expect(await db(env).query.clients.findMany()).toHaveLength(0)
    expect(await db(env).query.timeEntries.findMany()).toHaveLength(0)
    const ws = await apiRequest(env, 'GET', '/api/v1/workspace', undefined, asUser(admin.id))
    expect(ws.body.name).toBe('Opexia Consulting')
  })
})

describe('approval policy drives the timer max duration', () => {
  let env: TestEnv
  let admin: Awaited<ReturnType<typeof seedUser>>
  let worker: Awaited<ReturnType<typeof seedUser>>

  const HOUR_MS = 60 * 60 * 1000

  async function seedRunning15hAgo(projectId: string, userId: string) {
    return seedTimeEntry(env, projectId, {
      userId,
      status: 'running',
      startedAt: new Date(Date.now() - 15 * HOUR_MS),
      checksum: `running-${Math.random()}`,
    })
  }

  beforeEach(async () => {
    env = createTestEnv()
    admin = await seedUser(env, { role: 'admin' })
    worker = await seedUser(env, { role: 'worker' })
  })

  it('auto-stops an overdue timer using the configured policy max hours', async () => {
    const client = await seedClient(env)
    const project = await seedProject(env, client.id)

    await apiRequest(env, 'PATCH', '/api/v1/approval-policy', { maxTimerHours: 24 }, asUser(admin.id))
    const stillRunning = await seedRunning15hAgo(project.id, worker.id)
    expect(stillRunning).toBeTruthy()

    const kept = await apiRequest(env, 'GET', '/api/v1/timer/current?userId=' + worker.id, undefined, asUser(worker.id))
    expect(kept.body).not.toBeNull()
    expect(kept.body.status).toBe('running')

    await db(env).delete(schema.timeEntries).where(eq(schema.timeEntries.id, stillRunning.id))

    await apiRequest(env, 'PATCH', '/api/v1/approval-policy', { maxTimerHours: 1 }, asUser(admin.id))
    const overdue = await seedRunning15hAgo(project.id, worker.id)
    expect(overdue).toBeTruthy()

    const stopped = await apiRequest(env, 'GET', '/api/v1/timer/current?userId=' + worker.id, undefined, asUser(worker.id))
    expect(stopped.body).toBeNull()

    const rows = await db(env).select({ durationMinutes: schema.timeEntries.durationMinutes })
      .from(schema.timeEntries)
      .where(eq(schema.timeEntries.id, overdue.id))
    expect(rows[0].durationMinutes).toBe(60)
  })

  it('applies the default 12h policy when the singleton row is untouched', async () => {
    const client = await seedClient(env)
    const project = await seedProject(env, client.id)
    const overdue = await seedRunning15hAgo(project.id, worker.id)
    expect(overdue).toBeTruthy()

    const stopped = await apiRequest(env, 'GET', '/api/v1/timer/current?userId=' + worker.id, undefined, asUser(worker.id))
    expect(stopped.body).toBeNull()

    const rows = await db(env).select({ durationMinutes: schema.timeEntries.durationMinutes })
      .from(schema.timeEntries)
      .where(eq(schema.timeEntries.id, overdue.id))
    expect(rows[0].durationMinutes).toBe(720)
  })
})
