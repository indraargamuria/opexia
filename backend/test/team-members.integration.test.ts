import { describe, it, expect, beforeEach } from 'vitest'
import { createTestEnv, apiRequest, seedUser, seedClient, seedProject, seedTeamMember, seedTimeEntry } from './helpers.ts'
import type { TestEnv } from './helpers.ts'

describe('team members API', () => {
  let env: TestEnv

  beforeEach(() => {
    env = createTestEnv()
  })

  describe('GET /api/v1/users', () => {
    it('lists users with aggregate logged minutes', async () => {
      const user = await seedUser(env)
      const client = await seedClient(env)
      const project = await seedProject(env, client.id)
      await seedTimeEntry(env, project.id, { userId: user.id, durationMinutes: 120 })
      const res = await apiRequest(env, 'GET', '/api/v1/users')
      expect(res.status).toBe(200)
      const me = res.body.find((u: any) => u.id === user.id)
      expect(me.loggedMinutes).toBe(120)
    })
  })

  describe('GET /api/v1/team-members', () => {
    it('returns assignments with relations and per-assignment logged minutes', async () => {
      const user = await seedUser(env)
      const client = await seedClient(env)
      const project = await seedProject(env, client.id)
      const member = await seedTeamMember(env, user.id, project.id)
      await seedTimeEntry(env, project.id, { userId: user.id, durationMinutes: 75 })
      const res = await apiRequest(env, 'GET', '/api/v1/team-members')
      expect(res.status).toBe(200)
      const row = res.body.find((r: any) => r.id === member.id)
      expect(row.user.email).toBe(user.email)
      expect(row.project.name).toBe(project.name)
      expect(row.loggedMinutes).toBe(75)
    })
  })

  describe('GET /api/v1/team-members/:id', () => {
    it('returns a single assignment and 404 for unknown id', async () => {
      const user = await seedUser(env)
      const client = await seedClient(env)
      const project = await seedProject(env, client.id)
      const member = await seedTeamMember(env, user.id, project.id)
      const res = await apiRequest(env, 'GET', `/api/v1/team-members/${member.id}`)
      expect(res.status).toBe(200)
      expect(res.body.id).toBe(member.id)
      const missing = await apiRequest(env, 'GET', '/api/v1/team-members/nope')
      expect(missing.status).toBe(404)
    })
  })

  describe('POST /api/v1/team-members', () => {
    it('rejects an invalid role', async () => {
      const user = await seedUser(env)
      const client = await seedClient(env)
      const project = await seedProject(env, client.id)
      const res = await apiRequest(env, 'POST', '/api/v1/team-members', {
        userId: user.id,
        projectId: project.id,
        role: 'ceo',
      })
      expect(res.status).toBe(400)
    })
  })

  describe('PATCH /api/v1/team-members/:id', () => {
    it('updates role and billable rate', async () => {
      const user = await seedUser(env)
      const client = await seedClient(env)
      const project = await seedProject(env, client.id)
      const member = await seedTeamMember(env, user.id, project.id, { role: 'worker', billableRate: 100 })
      const res = await apiRequest(env, 'PATCH', `/api/v1/team-members/${member.id}`, {
        role: 'manager',
        billableRate: 200,
      })
      expect(res.status).toBe(200)
      expect(res.body.role).toBe('manager')
      expect(res.body.billableRate).toBe(200)
    })

    it('rejects an invalid role', async () => {
      const user = await seedUser(env)
      const client = await seedClient(env)
      const project = await seedProject(env, client.id)
      const member = await seedTeamMember(env, user.id, project.id)
      const res = await apiRequest(env, 'PATCH', `/api/v1/team-members/${member.id}`, { role: 'admin-extra' })
      expect(res.status).toBe(400)
    })

    it('returns 404 for unknown id', async () => {
      const res = await apiRequest(env, 'PATCH', '/api/v1/team-members/nope', { role: 'manager' })
      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/v1/team-members/:id', () => {
    it('removes the assignment while historical time entries stay resolvable', async () => {
      const user = await seedUser(env)
      const client = await seedClient(env)
      const project = await seedProject(env, client.id)
      const member = await seedTeamMember(env, user.id, project.id)
      const entry = await seedTimeEntry(env, project.id, { userId: user.id, durationMinutes: 60 })

      const res = await apiRequest(env, 'DELETE', `/api/v1/team-members/${member.id}`)
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)

      const missing = await apiRequest(env, 'GET', `/api/v1/team-members/${member.id}`)
      expect(missing.status).toBe(404)

      const entries = await apiRequest(env, 'GET', `/api/v1/time-entries?userId=${user.id}`)
      const stillThere = entries.body.find((e: any) => e.id === entry.id)
      expect(stillThere).toBeDefined()
    })

    it('returns 404 for unknown id', async () => {
      const res = await apiRequest(env, 'DELETE', '/api/v1/team-members/nope')
      expect(res.status).toBe(404)
    })
  })
})
