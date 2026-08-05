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

const WORKSPACE = { id: 'singleton', name: 'Opexia Consulting', slug: 'opexia-consulting', currency: 'USD', timezone: 'UTC' }
const APPROVAL = { id: 'singleton', approvalLevel: 'all', manualEntryWindowDays: 7, maxTimerHours: 12 }
const ERP = { id: 'singleton', exportFormat: 'sap', costCenterMappingEnabled: true }

let sent: { url: string; method: string; body: string | undefined }[] = []

const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input)
  const method = init?.method ?? 'GET'
  if (method !== 'GET') sent.push({ url, method, body: init?.body as string | undefined })
  let body: unknown
  if (url.includes('/api/v1/workspace')) body = WORKSPACE
  else if (url.includes('/api/v1/approval-policy')) body = APPROVAL
  else if (url.includes('/api/v1/erp-config')) body = ERP
  else body = []
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
})

function renderSettings() {
  const history = createMemoryHistory({ initialEntries: ['/settings'] })
  const router = createRouter({ routeTree, history })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

function lastSentBody(): Record<string, unknown> {
  const last = sent[sent.length - 1]
  return last?.body ? JSON.parse(last.body) : {}
}

describe('Settings page', () => {
  beforeEach(() => {
    sent = []
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

  it('renders persisted settings loaded from the API', async () => {
    renderSettings()

    await waitFor(() => expect(screen.getByLabelText('Organization Name')).toHaveValue('Opexia Consulting'))
    expect(screen.getByLabelText('Workspace Slug')).toHaveValue('opexia-consulting')
    expect(screen.getByLabelText('Default Currency')).toHaveValue('USD')
    expect(screen.getByLabelText('Timezone')).toHaveValue('UTC')
    expect(screen.getByLabelText('Approval Required')).toHaveValue('all')
    expect(screen.getByLabelText('Manual Entry Window')).toHaveValue(7)
    expect(screen.getByLabelText('Max Timer Duration')).toHaveValue(12)
    expect(screen.getByLabelText('Export Format')).toHaveValue('sap')
    expect(screen.getByLabelText('Cost Center Mapping')).toBeChecked()
  })

  it('saves workspace edits via PATCH and confirms with a Saved indicator', async () => {
    renderSettings()
    await waitFor(() => expect(screen.getByLabelText('Organization Name')).toHaveValue('Opexia Consulting'))

    fireEvent.change(screen.getByLabelText('Organization Name'), { target: { value: 'Acme Consulting' } })
    fireEvent.change(screen.getByLabelText('Default Currency'), { target: { value: 'EUR' } })
    fireEvent.change(screen.getByLabelText('Timezone'), { target: { value: 'Europe/Berlin' } })

    fireEvent.click(screen.getAllByText('Save Changes')[0])

    await waitFor(() => expect(sent.some((r) => r.method === 'PATCH' && r.url.includes('/api/v1/workspace'))).toBe(true))
    expect(lastSentBody()).toMatchObject({ name: 'Acme Consulting', currency: 'EUR', timezone: 'Europe/Berlin' })
    await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument())
  })

  it('saves approval policy and erp config changes', async () => {
    renderSettings()
    await waitFor(() => expect(screen.getByLabelText('Approval Required')).toHaveValue('all'))

    fireEvent.change(screen.getByLabelText('Approval Required'), { target: { value: 'manual' } })
    fireEvent.change(screen.getByLabelText('Max Timer Duration'), { target: { value: '24' } })
    await waitFor(() => expect(screen.getByLabelText('Approval Required')).toHaveValue('manual'))
    await waitFor(() => expect(screen.getByLabelText('Max Timer Duration')).toHaveValue(24))
    fireEvent.click(screen.getAllByText('Save Changes')[1])
    await waitFor(() => expect(sent.some((r) => r.url.includes('/api/v1/approval-policy'))).toBe(true))
    expect(lastSentBody()).toMatchObject({ approvalLevel: 'manual', maxTimerHours: 24 })

    fireEvent.change(screen.getByLabelText('Export Format'), { target: { value: 'workday' } })
    fireEvent.click(screen.getAllByText('Save Changes')[2])
    await waitFor(() => expect(sent.some((r) => r.url.includes('/api/v1/erp-config'))).toBe(true))
    expect(lastSentBody()).toMatchObject({ exportFormat: 'workday' })
  })

  it('Danger Zone requires typing the slug before deleting the workspace', async () => {
    renderSettings()
    await waitFor(() => expect(screen.getByLabelText('Organization Name')).toHaveValue('Opexia Consulting'))

    fireEvent.click(screen.getByText('Delete'))
    const confirm = screen.getByLabelText('Confirmation text')
    fireEvent.change(confirm, { target: { value: 'wrong-slug' } })
    const deleteButton = screen.getByRole('button', { name: 'Delete Workspace' })
    expect((deleteButton as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(confirm, { target: { value: 'opexia-consulting' } })
    expect((deleteButton as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(deleteButton)

    await waitFor(() => expect(sent.some((r) => r.method === 'DELETE' && r.url.includes('/api/v1/workspace'))).toBe(true))
  })
})
