import { describe, it, expect } from 'vitest'
import { isValidTeamRole, teamRoles } from '../src/lib/teamMembers.ts'

describe('isValidTeamRole', () => {
  it('accepts every documented role', () => {
    for (const role of teamRoles) {
      expect(isValidTeamRole(role)).toBe(true)
    }
  })

  it('rejects unknown and malformed roles', () => {
    expect(isValidTeamRole('ceo')).toBe(false)
    expect(isValidTeamRole('')).toBe(false)
    expect(isValidTeamRole(42)).toBe(false)
    expect(isValidTeamRole(null)).toBe(false)
    expect(isValidTeamRole(undefined)).toBe(false)
  })
})
