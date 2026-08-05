import { describe, it, expect } from 'vitest'
import { ROLES, isRole, hasPermission, hasAnyRole, ROLE_PERMISSIONS } from '@/lib/rbac'

describe('rbac', () => {
  it('documents the four roles', () => {
    expect(ROLES).toEqual(['worker', 'manager', 'admin', 'viewer'])
    expect(isRole('worker')).toBe(true)
    expect(isRole('owner')).toBe(false)
  })

  it('worker has own-time permissions only', () => {
    expect(hasPermission('worker', 'time:log')).toBe(true)
    expect(hasPermission('worker', 'time:editOwn')).toBe(true)
    expect(hasPermission('worker', 'time:approve')).toBe(false)
    expect(hasPermission('worker', 'admin:audit')).toBe(false)
  })

  it('manager adds approval, any-entry edits, team reports, export', () => {
    expect(hasPermission('manager', 'time:approve')).toBe(true)
    expect(hasPermission('manager', 'time:editAny')).toBe(true)
    expect(hasPermission('manager', 'reports:team')).toBe(true)
    expect(hasPermission('manager', 'data:export')).toBe(true)
    expect(hasPermission('manager', 'reports:org')).toBe(false)
    expect(hasPermission('manager', 'admin:audit')).toBe(false)
  })

  it('admin has every permission', () => {
    for (const permission of new Set(Object.values(ROLE_PERMISSIONS).flat())) {
      expect(hasPermission('admin', permission)).toBe(true)
    }
  })

  it('hasAnyRole checks membership', () => {
    expect(hasAnyRole('manager', ['manager', 'admin'])).toBe(true)
    expect(hasAnyRole('worker', ['manager', 'admin'])).toBe(false)
  })
})
