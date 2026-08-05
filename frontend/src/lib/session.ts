export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'
export const DEMO_ROLE = 'admin'

export type SessionRole = 'worker' | 'manager' | 'admin' | 'viewer'

export interface Session {
  id: string
  role: SessionRole
}

// Stub session until Phase 6 auth. All API requests carry this identity via the
// `X-User-Id` header so backend RBAC resolves a consistent caller.
export function getSession(): Session {
  return { id: DEMO_USER_ID, role: DEMO_ROLE }
}
