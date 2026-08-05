import type { SessionRole } from '@/lib/session'

export const ROLES: SessionRole[] = ['worker', 'manager', 'admin', 'viewer']

export type Permission =
  | 'time:log'
  | 'time:editOwn'
  | 'time:editAny'
  | 'time:approve'
  | 'reports:team'
  | 'reports:org'
  | 'data:export'
  | 'admin:manage'
  | 'admin:users'
  | 'admin:audit'

// Mirrors backend/src/lib/rbac.ts (PRD §2.3 access control matrix).
export const ROLE_PERMISSIONS: Record<SessionRole, Permission[]> = {
  worker: ['time:log', 'time:editOwn'],
  manager: ['time:log', 'time:editOwn', 'time:editAny', 'time:approve', 'reports:team', 'data:export'],
  admin: [
    'time:log',
    'time:editOwn',
    'time:editAny',
    'time:approve',
    'reports:team',
    'reports:org',
    'data:export',
    'admin:manage',
    'admin:users',
    'admin:audit',
  ],
  viewer: ['time:log'],
}

export function isRole(value: unknown): value is SessionRole {
  return typeof value === 'string' && (ROLES as string[]).includes(value)
}

export function hasPermission(role: SessionRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function hasAnyRole(role: SessionRole, roles: SessionRole[]): boolean {
  return roles.includes(role)
}
