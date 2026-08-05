import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRouter, createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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

import { getSession, isAuthenticated } from '@/lib/session'

const CLIENT_REPORT = {
  clientId: 'c1',
  client: { id: 'c1', name: 'Acme Corp', code: 'acme' },
  period: { dateFrom: '2026-08-01', dateTo: '2026-08-05' },
  totals: { minutes: 300, hours: 5, count: 4, cost: 535 },
  projectCount: 1,
  workerCount: 2,
  weeks: 4,
  utilizationPercent: 3,
  byProject: [
    { projectId: 'p1', name: 'Alpha', status: 'active', minutes: 300, hours: 5, cost: 535, budgetUtilization: { percentage: 92, level: 'warning' } },
  ],
}

const TEAM_REPORT = {
  period: { dateFrom: '2026-08-01', dateTo: '2026-08-05' },
  weeks: 4,
  members: [
    { userId: 'u1', name: 'Bob', email: 'bob@opexia.test', role: 'worker', minutes: 300, hours: 5, count: 4, projectCount: 1, utilizationPercent: 92 },
  ],
  teamTotals: { minutes: 300, hours: 5, activeWorkerCount: 1, averageUtilizationPercent: 92 },
}

const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
  const url = String(input)
  let body: unknown
  if (url.includes('/api/v1/clients')) {
    body = [{ id: 'c1', name: 'Acme Corp' }]
  } else if (url.includes('/api/v1/reports/team')) {
    body = TEAM_REPORT
  } else if (url.includes('/api/v1/reports/client')) {
    body = CLIENT_REPORT
  } else {
    body = []
  }
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
})

function renderReports() {
  const history = createMemoryHistory({ initialEntries: ['/reports'] })
  const router = createRouter({ routeTree, history })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

function fetchedUrls(): string[] {
  return fetchMock.mock.calls.map((c) => String(c[0]))
}

describe('Reports page', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', fetchMock)
    vi.mocked(isAuthenticated).mockReturnValue(true)
    vi.mocked(getSession).mockReturnValue({ id: '00000000-0000-0000-0000-000000000001', role: 'admin' } as Session)
  })

  afterEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('renders real aggregation data from the API', async () => {
    renderReports()

    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument())
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getAllByText('5.0h').length).toBeGreaterThan(0)
    expect(screen.getAllByText('$535').length).toBeGreaterThan(0)
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('custom range selection drives the API filters', async () => {
    renderReports()
    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('Period'), { target: { value: 'custom' } })
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-06-01' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-06-30' } })

    await waitFor(() => {
      const urls = fetchedUrls().join(' ')
      expect(urls).toContain('dateFrom=2026-06-01')
      expect(urls).toContain('dateTo=2026-06-30')
    })
  })

  it('Export Excel downloads a blob from the export endpoint', async () => {
    const createObjectURL = vi.fn(() => 'blob:mock')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    renderReports()
    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument())

    fireEvent.click(screen.getByText('Export Excel'))

    await waitFor(() => {
      const urls = fetchedUrls().join(' ')
      expect(urls).toContain('/api/v1/reports/export?format=xlsx')
      expect(urls).toContain('dateFrom=')
    })
    expect(clickSpy).toHaveBeenCalled()
    clickSpy.mockRestore()
  })
})
