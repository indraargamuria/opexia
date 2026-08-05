import { redirect } from '@tanstack/react-router'
import { getSession, isAuthenticated } from '@/lib/session'
import { hasPermission, type Permission } from '@/lib/rbac'
import type { SessionRole } from '@/lib/session'

export type RedirectTarget = '/' | '/login'

export interface RouteAccessContext {
  authenticated: boolean
  role: SessionRole
}

// Route -> required permission. `null` means any authenticated user may enter.
export const ROUTE_PERMISSIONS: Record<string, Permission | null> = {
  '/': null,
  '/projects': null,
  '/profile': null,
  '/team': 'reports:team',
  '/approvals': 'time:approve',
  '/reports': 'reports:team',
  '/tags': 'admin:manage',
  '/settings': 'admin:manage',
}

export function evaluateRouteAccess(pathname: string, ctx: RouteAccessContext): RedirectTarget | null {
  if (pathname === '/login') return null
  if (!ctx.authenticated) return '/login'
  const permission = ROUTE_PERMISSIONS[pathname]
  if (permission && !hasPermission(ctx.role, permission)) return '/'
  return null
}

export function routeGuard(pathname: string) {
  return (): Response | undefined => {
    const target = evaluateRouteAccess(pathname, {
      authenticated: isAuthenticated(),
      role: getSession().role,
    })
    return target ? redirect({ to: target }) : undefined
  }
}
