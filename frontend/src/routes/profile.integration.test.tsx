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

const ME = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'jane.doe@opexia.com',
  name: 'Jane Doe',
  avatarUrl: null,
  role: 'admin',
  hourlyRate: 185,
  timezone: 'UTC',
  dateFormat: 'YYYY-MM-DD',
  weeklyStartDay: 'monday',
  createdAt: '2024-10-01T00:00:00.000Z',
  updatedAt: '2024-10-01T00:00:00.000Z',
}

let sent: { url: string; method: string; body: string | undefined }[] = []

const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input)
  const method = init?.method ?? 'GET'
  if (method !== 'GET') sent.push({ url, method, body: init?.body as string | undefined })
  let body: unknown
  if (url.includes('/password')) body = { ok: true }
  else if (url.includes('/api/v1/users/me')) body = ME
  else body = []
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
})

function renderProfile() {
  const history = createMemoryHistory({ initialEntries: ['/profile'] })
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

describe('Profile page', () => {
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

  it('renders the persisted profile with email and role disabled', async () => {
    renderProfile()

    await waitFor(() => expect(screen.getByLabelText('Full Name')).toHaveValue('Jane Doe'))
    expect(screen.getByText('jane.doe@opexia.com')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('jane.doe@opexia.com')
    expect(screen.getByLabelText('Email')).toBeDisabled()
    expect(screen.getByLabelText('Role')).toHaveValue('admin')
    expect(screen.getByLabelText('Role')).toBeDisabled()
    expect(screen.getByLabelText('Default Hourly Rate')).toHaveValue(185)
    expect(screen.getByLabelText('Timezone')).toHaveValue('UTC')
    expect(screen.getByLabelText('Date Format')).toHaveValue('YYYY-MM-DD')
    expect(screen.getByLabelText('Weekly Start Day')).toHaveValue('monday')
  })

  it('saves personal info changes via PATCH', async () => {
    renderProfile()
    await waitFor(() => expect(screen.getByLabelText('Full Name')).toHaveValue('Jane Doe'))

    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Jane A. Doe' } })
    fireEvent.change(screen.getByLabelText('Default Hourly Rate'), { target: { value: '210' } })

    fireEvent.click(screen.getAllByText('Save Changes')[0])

    await waitFor(() => expect(sent.some((r) => r.method === 'PATCH' && r.url.includes('/api/v1/users/me'))).toBe(true))
    expect(lastSentBody()).toMatchObject({ name: 'Jane A. Doe', hourlyRate: 210 })
    await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument())
  })

  it('saves preference changes via PATCH', async () => {
    renderProfile()
    await waitFor(() => expect(screen.getByLabelText('Full Name')).toHaveValue('Jane Doe'))

    fireEvent.change(screen.getByLabelText('Timezone'), { target: { value: 'Europe/Berlin' } })
    fireEvent.change(screen.getByLabelText('Date Format'), { target: { value: 'DD-MM-YYYY' } })
    fireEvent.change(screen.getByLabelText('Weekly Start Day'), { target: { value: 'sunday' } })

    fireEvent.click(screen.getByText('Save Preferences'))

    await waitFor(() => expect(sent.some((r) => r.url.includes('/api/v1/users/me'))).toBe(true))
    expect(lastSentBody()).toMatchObject({ timezone: 'Europe/Berlin', dateFormat: 'DD-MM-YYYY', weeklyStartDay: 'sunday' })
  })

  it('rejects mismatched password confirmation without calling the API', async () => {
    renderProfile()
    await waitFor(() => expect(screen.getByLabelText('Full Name')).toHaveValue('Jane Doe'))

    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'old-pass' } })
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'new-secret-1' } })
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'different-1' } })

    fireEvent.click(screen.getByText('Update Password'))

    await waitFor(() => expect(screen.getByText('New password and confirmation do not match.')).toBeInTheDocument())
    expect(sent.some((r) => r.url.includes('/password'))).toBe(false)
  })

  it('posts a password change and clears the form on success', async () => {
    renderProfile()
    await waitFor(() => expect(screen.getByLabelText('Full Name')).toHaveValue('Jane Doe'))

    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'old-pass' } })
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'new-secret-1' } })
    fireEvent.change(screen.getByLabelText('Confirm New Password'), { target: { value: 'new-secret-1' } })

    fireEvent.click(screen.getByText('Update Password'))

    await waitFor(() => expect(sent.some((r) => r.url.includes('/api/v1/users/me/password'))).toBe(true))
    expect(lastSentBody()).toMatchObject({ currentPassword: 'old-pass', newPassword: 'new-secret-1' })
    await waitFor(() => expect(screen.getByText('Saved')).toBeInTheDocument())
    expect(screen.getByLabelText('New Password')).toHaveValue('')
  })

  it('keeps the two-factor toggle disabled', async () => {
    renderProfile()
    await waitFor(() => expect(screen.getByLabelText('Full Name')).toHaveValue('Jane Doe'))

    const toggle = screen.getByText('Enable')
    expect((toggle as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('Two-factor authentication is not available yet.')).toBeInTheDocument()
  })
})
