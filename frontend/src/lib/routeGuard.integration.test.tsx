import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRouter, createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { routeTree } from '@/routeTree.gen'
import type { Session } from '@/lib/session'

vi.mock('@/lib/session', () => ({
  DEMO_USER_ID: '00000000-0000-0000-0000-000000000001',
  DEMO_ROLE: 'admin',
  AUTH_TOKEN_KEY: 'opexia_token',
  getSession: vi.fn(),
  isAuthenticated: vi.fn(),
  clearSession: vi.fn(),
}))

import { getSession, isAuthenticated, AUTH_TOKEN_KEY } from '@/lib/session'

function mockFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const body = url.includes('/reports/me')
        ? { weeklyTotalMinutes: 0, weeklyTotalHours: 0, utilizationPercent: 0, activeProjects: 0 }
        : url.includes('/timer/current')
          ? null
          : []
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
  )
}

function renderApp(initialPath: string) {
  const history = createMemoryHistory({ initialEntries: [initialPath] })
  const router = createRouter({ routeTree, history })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

describe('route guards (router integration)', () => {
  beforeEach(() => {
    localStorage.clear()
    mockFetch()
    vi.mocked(getSession).mockReturnValue({ id: 'u1', role: 'admin' } as Session)
  })

  afterEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('logged-out user opening / is redirected to /login', async () => {
    vi.mocked(isAuthenticated).mockReturnValue(false)
    const router = renderApp('/')
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(screen.getByText('Sign in to Opexia')).toBeInTheDocument()
  })

  it('worker opening /settings is redirected to /', async () => {
    vi.mocked(isAuthenticated).mockReturnValue(true)
    vi.mocked(getSession).mockReturnValue({ id: 'u1', role: 'worker' } as Session)
    const router = renderApp('/settings')
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('admin opening /settings stays on /settings', async () => {
    vi.mocked(isAuthenticated).mockReturnValue(true)
    localStorage.setItem(AUTH_TOKEN_KEY, 'mock_jwt')
    const router = renderApp('/settings')
    await waitFor(() => expect(router.state.location.pathname).toBe('/settings'))
  })
})
