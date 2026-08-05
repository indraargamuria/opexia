import { describe, it, expect } from 'vitest'
import {
  userRoles,
  isUserRole,
  canLogOwnTime,
  canEditOwnEntries,
  canEditAnyEntry,
  canApprove,
  canViewTeamReports,
  canViewOrgReports,
  canManageMasterData,
  canManageUsers,
  canViewAuditLogs,
  canExport,
  isGlobalAdmin,
  projectRole,
} from '../src/lib/rbac.ts'

describe('isUserRole', () => {
  it('accepts all four documented roles and rejects others', () => {
    expect(userRoles).toEqual(['worker', 'manager', 'admin', 'viewer'])
    for (const role of userRoles) expect(isUserRole(role)).toBe(true)
    expect(isUserRole('owner')).toBe(false)
    expect(isUserRole(undefined)).toBe(false)
  })
})

describe('permission matrix (PRD §2.3)', () => {
  it('worker: own-time logging and editing only', () => {
    expect(canLogOwnTime('worker')).toBe(true)
    expect(canEditOwnEntries('worker')).toBe(true)
    expect(canEditAnyEntry('worker')).toBe(false)
    expect(canApprove('worker')).toBe(false)
    expect(canViewTeamReports('worker')).toBe(false)
    expect(canViewOrgReports('worker')).toBe(false)
    expect(canManageMasterData('worker')).toBe(false)
    expect(canManageUsers('worker')).toBe(false)
    expect(canViewAuditLogs('worker')).toBe(false)
    expect(canExport('worker')).toBe(false)
  })

  it('manager: team reports, approval, any-entry edits, export; not org/admin', () => {
    expect(canEditAnyEntry('manager')).toBe(true)
    expect(canApprove('manager')).toBe(true)
    expect(canViewTeamReports('manager')).toBe(true)
    expect(canExport('manager')).toBe(true)
    expect(canViewOrgReports('manager')).toBe(false)
    expect(canManageMasterData('manager')).toBe(false)
    expect(canManageUsers('manager')).toBe(false)
    expect(canViewAuditLogs('manager')).toBe(false)
  })

  it('admin: everything including org reports, master data, users, audit', () => {
    for (const fn of [
      canLogOwnTime, canEditOwnEntries, canEditAnyEntry, canApprove,
      canViewTeamReports, canViewOrgReports, canManageMasterData,
      canManageUsers, canViewAuditLogs, canExport,
    ]) {
      expect(fn('admin')).toBe(true)
    }
    expect(isGlobalAdmin('admin')).toBe(true)
    expect(isGlobalAdmin('manager')).toBe(false)
  })

  it('viewer: view-only, no approval or management', () => {
    expect(canApprove('viewer')).toBe(false)
    expect(canEditAnyEntry('viewer')).toBe(false)
    expect(canViewTeamReports('viewer')).toBe(false)
    expect(canManageMasterData('viewer')).toBe(false)
    expect(canViewAuditLogs('viewer')).toBe(false)
  })
})

describe('projectRole resolution', () => {
  it('membership role wins over global role', () => {
    expect(projectRole('worker', 'manager')).toBe('manager')
    expect(projectRole('worker', 'viewer')).toBe('viewer')
  })

  it('falls back to the global role without a membership', () => {
    expect(projectRole('admin', undefined)).toBe('admin')
    expect(projectRole('worker', undefined)).toBe('worker')
  })
})
