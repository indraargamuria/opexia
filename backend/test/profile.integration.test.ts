import { describe, it, expect, beforeEach } from 'vitest'
import { eq } from 'drizzle-orm'
import { createTestEnv, apiRequest, db, seedUser, seedClient, seedProject } from './helpers.ts'
import type { TestEnv } from './helpers.ts'
import * as schema from '../src/db/schema.ts'

function asUser(id: string) {
  return { 'X-User-Id': id }
}

describe('users/me endpoints', () => {
  let env: TestEnv
  let user: Awaited<ReturnType<typeof seedUser>>

  beforeEach(async () => {
    env = createTestEnv()
    user = await seedUser(env, { name: 'Jane Doe', role: 'worker' })
  })

  it('GET /users/me returns the caller with defaults and no passwordHash', async () => {
    const res = await apiRequest(env, 'GET', '/api/v1/users/me', undefined, asUser(user.id))
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      id: user.id,
      name: 'Jane Doe',
      role: 'worker',
      hourlyRate: null,
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      weeklyStartDay: 'monday',
    })
    expect(res.body.passwordHash).toBeUndefined()
  })

  it('returns 401 without an authenticated user header', async () => {
    const noHeader = await apiRequest(env, 'GET', '/api/v1/users/me')
    expect(noHeader.status).toBe(401)

    const unknown = await apiRequest(env, 'GET', '/api/v1/users/me', undefined, asUser('does-not-exist'))
    expect(unknown.status).toBe(401)
  })

  it('PATCH merges only provided fields and persists across requests', async () => {
    const res = await apiRequest(env, 'PATCH', '/api/v1/users/me', {
      name: 'Jane A. Doe',
      hourlyRate: 185,
      timezone: 'Europe/Berlin',
      dateFormat: 'DD-MM-YYYY',
      weeklyStartDay: 'sunday',
    }, asUser(user.id))
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      name: 'Jane A. Doe',
      hourlyRate: 185,
      timezone: 'Europe/Berlin',
      dateFormat: 'DD-MM-YYYY',
      weeklyStartDay: 'sunday',
    })

    const partial = await apiRequest(env, 'PATCH', '/api/v1/users/me', { timezone: 'America/New_York' }, asUser(user.id))
    expect(partial.body).toMatchObject({
      name: 'Jane A. Doe',
      hourlyRate: 185,
      timezone: 'America/New_York',
      dateFormat: 'DD-MM-YYYY',
      weeklyStartDay: 'sunday',
    })

    const again = await apiRequest(env, 'GET', '/api/v1/users/me', undefined, asUser(user.id))
    expect(again.body).toMatchObject({ name: 'Jane A. Doe', hourlyRate: 185, timezone: 'America/New_York' })
  })

  it('clears hourlyRate when patched to null', async () => {
    await apiRequest(env, 'PATCH', '/api/v1/users/me', { hourlyRate: 120 }, asUser(user.id))
    const cleared = await apiRequest(env, 'PATCH', '/api/v1/users/me', { hourlyRate: null }, asUser(user.id))
    expect(cleared.status).toBe(200)
    expect(cleared.body.hourlyRate).toBeNull()
  })

  it('validates profile fields', async () => {
    const badEmail = await apiRequest(env, 'PATCH', '/api/v1/users/me', { email: 'nope' }, asUser(user.id))
    expect(badEmail.status).toBe(400)

    const badTz = await apiRequest(env, 'PATCH', '/api/v1/users/me', { timezone: 'Not/AZone' }, asUser(user.id))
    expect(badTz.status).toBe(400)

    const badFormat = await apiRequest(env, 'PATCH', '/api/v1/users/me', { dateFormat: 'YYYY/MM/DD' }, asUser(user.id))
    expect(badFormat.status).toBe(400)

    const badDay = await apiRequest(env, 'PATCH', '/api/v1/users/me', { weeklyStartDay: 'friday' }, asUser(user.id))
    expect(badDay.status).toBe(400)

    const badRate = await apiRequest(env, 'PATCH', '/api/v1/users/me', { hourlyRate: -5 }, asUser(user.id))
    expect(badRate.status).toBe(400)

    const emptyName = await apiRequest(env, 'PATCH', '/api/v1/users/me', { name: '  ' }, asUser(user.id))
    expect(emptyName.status).toBe(400)
  })

  it('rejects an email already used by another user', async () => {
    const other = await seedUser(env, { email: 'taken@opexia.test' })
    expect(other).toBeTruthy()
    const dup = await apiRequest(env, 'PATCH', '/api/v1/users/me', { email: 'taken@opexia.test' }, asUser(user.id))
    expect(dup.status).toBe(409)
  })

  it('password change: sets on first run, then requires the current password', async () => {
    const set = await apiRequest(env, 'POST', '/api/v1/users/me/password', {
      currentPassword: 'irrelevant-first-run',
      newPassword: 'brand-new-pass-1',
    }, asUser(user.id))
    expect(set.status).toBe(200)
    expect(set.body.ok).toBe(true)

    const wrong = await apiRequest(env, 'POST', '/api/v1/users/me/password', {
      currentPassword: 'wrong-password',
      newPassword: 'another-pass-2',
    }, asUser(user.id))
    expect(wrong.status).toBe(401)

    const change = await apiRequest(env, 'POST', '/api/v1/users/me/password', {
      currentPassword: 'brand-new-pass-1',
      newPassword: 'rotated-pass-3',
    }, asUser(user.id))
    expect(change.status).toBe(200)
    expect(change.body.ok).toBe(true)
  })

  it('validates password change payloads', async () => {
    const short = await apiRequest(env, 'POST', '/api/v1/users/me/password', {
      currentPassword: 'x',
      newPassword: 'short',
    }, asUser(user.id))
    expect(short.status).toBe(400)

    const missing = await apiRequest(env, 'POST', '/api/v1/users/me/password', { newPassword: 'a-password' }, asUser(user.id))
    expect(missing.status).toBe(400)
  })

  it('stores a hash, not the plaintext', async () => {
    await apiRequest(env, 'POST', '/api/v1/users/me/password', {
      currentPassword: 'anything',
      newPassword: 'stored-hash-pass-9',
    }, asUser(user.id))
    const [row] = await db(env).select({ hash: schema.users.passwordHash }).from(schema.users).where(eq(schema.users.id, user.id))
    expect(row.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(row.hash).not.toContain('stored-hash-pass-9')
  })
})

describe('passwordHash redaction', () => {
  let env: TestEnv
  let admin: Awaited<ReturnType<typeof seedUser>>
  let worker: Awaited<ReturnType<typeof seedUser>>

  beforeEach(async () => {
    env = createTestEnv()
    admin = await seedUser(env, { role: 'admin' })
    worker = await seedUser(env, { name: 'Hash Leak Watch', role: 'worker' })
    await db(env).update(schema.users).set({ passwordHash: 'x'.repeat(64) }).where(eq(schema.users.id, worker.id))
  })

  it('users list never exposes passwordHash', async () => {
    const res = await apiRequest(env, 'GET', '/api/v1/users', undefined, asUser(admin.id))
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    for (const u of res.body as Record<string, unknown>[]) {
      expect(u.passwordHash).toBeUndefined()
    }
  })

  it('team-members responses strip the nested user passwordHash', async () => {
    const client = await seedClient(env)
    const project = await seedProject(env, client.id)
    const assign = await apiRequest(env, 'POST', '/api/v1/team-members', {
      userId: worker.id,
      projectId: project.id,
      role: 'worker',
    }, asUser(admin.id))
    expect(assign.status).toBe(201)

    const list = await apiRequest(env, 'GET', '/api/v1/team-members', undefined, asUser(admin.id))
    const entry = (list.body as any[]).find((r) => r.userId === worker.id)
    expect(entry).toBeTruthy()
    expect(entry.user).toMatchObject({ name: 'Hash Leak Watch' })
    expect(entry.user.passwordHash).toBeUndefined()

    const one = await apiRequest(env, 'GET', `/api/v1/team-members/${assign.body.id}`, undefined, asUser(admin.id))
    expect(one.body.user.passwordHash).toBeUndefined()
  })
})
