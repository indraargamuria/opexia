import { describe, it, expect, beforeEach } from 'vitest'
import XLSX from 'xlsx'
import { createTestEnv, makeRequest, apiRequest, db, seedUser, seedClient, seedProject, seedTimeEntry, seedTeamMember, seedTag, attachTag } from './helpers.ts'
import type { TestEnv } from './helpers.ts'
import * as schema from '../src/db/schema.ts'
import { EXPORT_HEADERS } from '../src/lib/exportRows.ts'

function asUser(id: string) {
  return { 'X-User-Id': id }
}

const JULY_WINDOW = 'dateFrom=2026-07-01&dateTo=2026-07-31'

async function seedExportFixture(env: TestEnv) {
  const client = await seedClient(env, { name: 'Acme Corp', code: 'acme', billingRate: 150 })
  const project = await seedProject(env, client.id, { name: 'Alpha', code: 'alp' })
  const bob = await seedUser(env, { name: 'Bob', role: 'worker' })
  await seedTeamMember(env, bob.id, project.id, { billableRate: 100 })
  const tag = await seedTag(env, { name: 'Development' })

  const entry = await seedTimeEntry(env, project.id, {
    userId: bob.id,
    description: 'Fix auth flow',
    durationMinutes: 90,
    startedAt: new Date(2026, 6, 15, 9),
    status: 'approved',
  })
  await attachTag(env, entry.id, tag.id)

  await seedTimeEntry(env, project.id, {
    userId: bob.id,
    durationMinutes: 45,
    startedAt: new Date(2026, 6, 16, 10),
    status: 'rejected',
  })
  await seedTimeEntry(env, project.id, {
    userId: bob.id,
    durationMinutes: 999,
    startedAt: new Date(2026, 6, 17, 11),
    status: 'running',
  })

  return { client, project, bob }
}

describe('reports export endpoint', () => {
  let env: TestEnv
  let admin: Awaited<ReturnType<typeof seedUser>>

  beforeEach(async () => {
    env = createTestEnv()
    admin = await seedUser(env, { role: 'admin' })
  })

  it('returns a valid xlsx workbook with the ERP-ready schema', async () => {
    await seedExportFixture(env)
    const res = await makeRequest(
      `/api/v1/reports/export?format=xlsx&${JULY_WINDOW}`,
      { headers: asUser(admin.id) },
      env,
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('spreadsheetml')
    expect(res.headers.get('content-disposition')).toContain('opexia-time-entries-2026-07-01_2026-07-31.xlsx')

    const wb = XLSX.read(await res.arrayBuffer())
    expect(wb.SheetNames).toEqual(['Time Entries'])
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets['Time Entries'], { header: 1 })
    expect(rows[0]).toEqual([...EXPORT_HEADERS])
    expect(rows).toHaveLength(2)
    expect(rows[1]).toEqual([
      '2026-07-15',
      'Bob',
      'Acme Corp',
      'Alpha',
      'Fix auth flow',
      'Development',
      1.5,
      100,
      150,
      'Approved',
    ])
  })

  it('falls back to the client billing rate when no team rate exists', async () => {
    const { project, client } = await seedExportFixture(env)
    await db(env).delete(schema.teamMembers)
    const entry = await seedTimeEntry(env, project.id, {
      durationMinutes: 60,
      startedAt: new Date(2026, 6, 20, 9),
      status: 'pending',
    })
    expect(entry).toBeTruthy()

    const res = await makeRequest(`/api/v1/reports/export?format=xlsx&${JULY_WINDOW}`, { headers: asUser(admin.id) }, env)
    const wb = XLSX.read(await res.arrayBuffer())
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets['Time Entries'], { header: 1 })
    const row = rows.find((r) => r[3] === 'Alpha' && r[6] === 1)
    expect(row?.[7]).toBe(client.billingRate)
    expect(row?.[8]).toBe(150)
  })

  it('blocks non-manager roles with 403', async () => {
    const worker = await seedUser(env, { role: 'worker' })
    const res = await apiRequest(env, 'GET', `/api/v1/reports/export?format=xlsx&${JULY_WINDOW}`, undefined, asUser(worker.id))
    expect(res.status).toBe(403)
  })

  it('rejects unknown formats and inverted ranges with 400', async () => {
    const badFormat = await apiRequest(env, 'GET', '/api/v1/reports/export?format=pdf', undefined, asUser(admin.id))
    expect(badFormat.status).toBe(400)

    const inverted = await apiRequest(env, 'GET', '/api/v1/reports/export?format=xlsx&dateFrom=2026-08-01&dateTo=2026-07-01', undefined, asUser(admin.id))
    expect(inverted.status).toBe(400)
  })
})
