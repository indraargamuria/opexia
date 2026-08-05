import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { evaluateRouteAccess, ROUTE_PERMISSIONS } from '@/lib/routeGuard'
import { isAuthenticated, AUTH_TOKEN_KEY, clearSession, getSession } from '@/lib/session'

const authed = (role: 'worker' | 'manager' | 'admin' | 'viewer') => ({
  authenticated: true,
  role,
})

describe('evaluateRouteAccess', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    localStorage.clear()
  })

  it('always lets /login through', () => {
    expect(evaluateRouteAccess('/login', { authenticated: false, role: 'worker' })).toBeNull()
  })

  it('redirects unauthenticated users to /login on any protected route', () => {
    expect(evaluateRouteAccess('/', { authenticated: false, role: 'worker' })).toBe('/login')
    expect(evaluateRouteAccess('/team', { authenticated: false, role: 'worker' })).toBe('/login')
    expect(evaluateRouteAccess('/settings', { authenticated: false, role: 'admin' })).toBe('/login')
  })

  it('worker may open dashboard and projects but is blocked from team/reports/tags/approvals/settings', () => {
    expect(evaluateRouteAccess('/', authed('worker'))).toBeNull()
    expect(evaluateRouteAccess('/projects', authed('worker'))).toBeNull()
    expect(evaluateRouteAccess('/profile', authed('worker'))).toBeNull()
    expect(evaluateRouteAccess('/team', authed('worker'))).toBe('/')
    expect(evaluateRouteAccess('/reports', authed('worker'))).toBe('/')
    expect(evaluateRouteAccess('/tags', authed('worker'))).toBe('/')
    expect(evaluateRouteAccess('/approvals', authed('worker'))).toBe('/')
    expect(evaluateRouteAccess('/settings', authed('worker'))).toBe('/')
  })

  it('manager may open team/reports/approvals but not admin master-data pages', () => {
    expect(evaluateRouteAccess('/team', authed('manager'))).toBeNull()
    expect(evaluateRouteAccess('/reports', authed('manager'))).toBeNull()
    expect(evaluateRouteAccess('/approvals', authed('manager'))).toBeNull()
    expect(evaluateRouteAccess('/tags', authed('manager'))).toBe('/')
    expect(evaluateRouteAccess('/settings', authed('manager'))).toBe('/')
  })

  it('admin may open every route', () => {
    for (const pathname of Object.keys(ROUTE_PERMISSIONS)) {
      expect(evaluateRouteAccess(pathname, authed('admin'))).toBeNull()
    }
  })

  it('viewer may only open base routes', () => {
    expect(evaluateRouteAccess('/', authed('viewer'))).toBeNull()
    expect(evaluateRouteAccess('/team', authed('viewer'))).toBe('/')
    expect(evaluateRouteAccess('/settings', authed('viewer'))).toBe('/')
  })
})

describe('isAuthenticated', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => localStorage.clear())

  it('false when no token, true once stored', () => {
    expect(isAuthenticated()).toBe(false)
    localStorage.setItem(AUTH_TOKEN_KEY, 'mock_jwt')
    expect(isAuthenticated()).toBe(true)
  })

  it('clearSession removes the token', () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'mock_jwt')
    clearSession()
    expect(isAuthenticated()).toBe(false)
  })

  it('getSession returns the stub admin identity', () => {
    expect(getSession().role).toBe('admin')
  })
})
