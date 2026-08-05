import { describe, it, expect, beforeEach } from 'vitest'
import { createTestEnv, apiRequest, db, seedUser, seedClient, seedProject, seedTimeEntry, seedTag, attachTag } from './helpers.ts'
import type { TestEnv } from './helpers.ts'
import * as schema from '../src/db/schema'
import { eq } from 'drizzle-orm'

describe('tags API', () => {
  let env: TestEnv

  beforeEach(() => {
    env = createTestEnv()
  })

  describe('GET /api/v1/tags', () => {
    it('includes usage counts', async () => {
      const tag = await seedTag(env)
      const client = await seedClient(env)
      const project = await seedProject(env, client.id)
      const user = await seedUser(env)
      const entry = await seedTimeEntry(env, project.id, { userId: user.id })
      await attachTag(env, entry.id, tag.id)
      const res = await apiRequest(env, 'GET', '/api/v1/tags')
      expect(res.status).toBe(200)
      const row = res.body.find((t: any) => t.id === tag.id)
      expect(row.usageCount).toBe(1)
    })
  })

  describe('GET /api/v1/tags/:id', () => {
    it('returns a tag with usage count and 404 for unknown', async () => {
      const tag = await seedTag(env)
      const res = await apiRequest(env, 'GET', `/api/v1/tags/${tag.id}`)
      expect(res.status).toBe(200)
      expect(res.body.usageCount).toBe(0)
      const missing = await apiRequest(env, 'GET', '/api/v1/tags/nope')
      expect(missing.status).toBe(404)
    })
  })

  describe('POST /api/v1/tags', () => {
    it('rejects an invalid hex color', async () => {
      const res = await apiRequest(env, 'POST', '/api/v1/tags', { name: 'Overtime', color: 'red' })
      expect(res.status).toBe(400)
    })

    it('rejects duplicate names', async () => {
      await seedTag(env, { name: 'dupe' })
      const res = await apiRequest(env, 'POST', '/api/v1/tags', { name: 'dupe' })
      expect(res.status).toBe(409)
    })
  })

  describe('PATCH /api/v1/tags/:id', () => {
    it('updates color, category, and erp code', async () => {
      const tag = await seedTag(env)
      const res = await apiRequest(env, 'PATCH', `/api/v1/tags/${tag.id}`, {
        color: '#22c55e',
        category: 'Billing',
        erpCode: 'ERP-001',
      })
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ color: '#22c55e', category: 'Billing', erpCode: 'ERP-001' })
    })

    it('rejects an invalid hex color', async () => {
      const tag = await seedTag(env)
      const res = await apiRequest(env, 'PATCH', `/api/v1/tags/${tag.id}`, { color: 'red' })
      expect(res.status).toBe(400)
    })
  })

  describe('DELETE /api/v1/tags/:id', () => {
    it('removes junction rows together with the tag', async () => {
      const tag = await seedTag(env)
      const client = await seedClient(env)
      const project = await seedProject(env, client.id)
      const user = await seedUser(env)
      const entry = await seedTimeEntry(env, project.id, { userId: user.id })
      await attachTag(env, entry.id, tag.id)

      const res = await apiRequest(env, 'DELETE', `/api/v1/tags/${tag.id}`)
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)

      const junctions = await db(env).select().from(schema.timeEntryTags).where(eq(schema.timeEntryTags.tagId, tag.id))
      expect(junctions.length).toBe(0)
      const missing = await apiRequest(env, 'GET', `/api/v1/tags/${tag.id}`)
      expect(missing.status).toBe(404)
    })

    it('blocks deletion when referenced by an invoiced entry', async () => {
      const tag = await seedTag(env)
      const client = await seedClient(env)
      const project = await seedProject(env, client.id)
      const user = await seedUser(env)
      const entry = await seedTimeEntry(env, project.id, { userId: user.id, status: 'invoiced' })
      await attachTag(env, entry.id, tag.id)

      const res = await apiRequest(env, 'DELETE', `/api/v1/tags/${tag.id}`)
      expect(res.status).toBe(409)
      expect(res.body.error).toMatch(/invoiced/i)
    })

    it('returns 404 for unknown id', async () => {
      const res = await apiRequest(env, 'DELETE', '/api/v1/tags/nope')
      expect(res.status).toBe(404)
    })
  })
})
