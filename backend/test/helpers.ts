import { join } from 'node:path'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../src/db/schema'
import app from '../src/index'
import { D1Shim } from './d1-shim.ts'

export type TestEnv = { opexai_db: D1Shim }

const migrationsFolder = join(import.meta.dirname, '../drizzle/migrations')

export function createTestEnv(): TestEnv {
  return { opexai_db: new D1Shim(migrationsFolder) }
}

export function makeRequest(path: string, init?: RequestInit, env: TestEnv = createTestEnv()) {
  return app.request(path, init, env as never)
}

export async function apiRequest(
  env: TestEnv,
  method: string,
  path: string,
  body?: Record<string, unknown>,
) {
  const res = await app.request(
    path,
    {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    },
    env as never,
  )
  const json = await res.json().catch(() => null)
  return { status: res.status, body: json as any }
}

export function db(env: TestEnv) {
  return drizzle(env.opexai_db as any, { schema })
}

export async function seedUser(env: TestEnv, overrides: Partial<typeof schema.users.$inferInsert> = {}) {
  const [row] = await db(env).insert(schema.users).values({
    email: overrides.email ?? `user-${crypto.randomUUID().slice(0, 8)}@opexia.test`,
    name: overrides.name ?? 'Test User',
    ...overrides,
  }).returning()
  return row
}

export async function seedClient(env: TestEnv, overrides: Partial<typeof schema.clients.$inferInsert> = {}) {
  const suffix = crypto.randomUUID().slice(0, 8)
  const [row] = await db(env).insert(schema.clients).values({
    name: overrides.name ?? `Acme ${suffix}`,
    code: overrides.code ?? `acme-${suffix}`,
    billingRate: overrides.billingRate ?? 150,
    currency: overrides.currency ?? 'USD',
    ...overrides,
  }).returning()
  return row
}

export async function seedProject(env: TestEnv, clientId: string, overrides: Partial<typeof schema.projects.$inferInsert> = {}) {
  const suffix = crypto.randomUUID().slice(0, 8)
  const [row] = await db(env).insert(schema.projects).values({
    clientId,
    name: overrides.name ?? `Project ${suffix}`,
    code: overrides.code ?? `prj-${suffix}`,
    status: overrides.status ?? 'active',
    ...overrides,
  }).returning()
  return row
}

export async function seedTimeEntry(env: TestEnv, projectId: string, overrides: Partial<typeof schema.timeEntries.$inferInsert> = {}) {
  const [row] = await db(env).insert(schema.timeEntries).values({
    userId: overrides.userId ?? (await seedUser(env)).id,
    projectId,
    description: overrides.description ?? 'Seeded entry',
    startedAt: overrides.startedAt ?? new Date(),
    status: overrides.status ?? 'pending',
    entryMethod: overrides.entryMethod ?? 'timer',
    checksum: overrides.checksum ?? 'test-checksum',
    ...overrides,
  }).returning()
  return row
}

export async function seedTeamMember(env: TestEnv, userId: string, projectId: string, overrides: Partial<typeof schema.teamMembers.$inferInsert> = {}) {
  const [row] = await db(env).insert(schema.teamMembers).values({
    userId,
    projectId,
    role: overrides.role ?? 'worker',
    billableRate: overrides.billableRate ?? 100,
    ...overrides,
  }).returning()
  return row
}

export async function seedTag(env: TestEnv, overrides: Partial<typeof schema.tags.$inferInsert> = {}) {
  const suffix = crypto.randomUUID().slice(0, 8)
  const [row] = await db(env).insert(schema.tags).values({
    name: overrides.name ?? `Tag ${suffix}`,
    color: overrides.color ?? '#6366f1',
    ...overrides,
  }).returning()
  return row
}

export async function attachTag(env: TestEnv, timeEntryId: string, tagId: string) {
  await db(env).insert(schema.timeEntryTags).values({ timeEntryId, tagId })
}
