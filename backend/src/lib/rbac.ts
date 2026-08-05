export const userRoles = ['worker', 'manager', 'admin', 'viewer'] as const
export type UserRole = (typeof userRoles)[number]

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (userRoles as readonly string[]).includes(value)
}

// PRD §2.3 — Access Control Matrix
export function canLogOwnTime(role: UserRole): boolean {
  return true
}

export function canEditOwnEntries(role: UserRole): boolean {
  return true
}

export function canEditAnyEntry(role: UserRole): boolean {
  return role === 'manager' || role === 'admin'
}

export function canApprove(role: UserRole): boolean {
  return role === 'manager' || role === 'admin'
}

export function canViewTeamReports(role: UserRole): boolean {
  return role === 'manager' || role === 'admin'
}

export function canViewOrgReports(role: UserRole): boolean {
  return role === 'admin'
}

export function canManageMasterData(role: UserRole): boolean {
  return role === 'admin'
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'admin'
}

export function canViewAuditLogs(role: UserRole): boolean {
  return role === 'admin'
}

export function canExport(role: UserRole): boolean {
  return role === 'manager' || role === 'admin'
}

export function isGlobalAdmin(role: UserRole): boolean {
  return role === 'admin'
}

// Per-project resolution: a project membership role takes precedence over the
// global role; otherwise the global role applies.
export function projectRole(globalRole: UserRole, membershipRole: UserRole | undefined): UserRole {
  return membershipRole ?? globalRole
}
