const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.json()
}

export const api = {
  projects: {
    list: () => request<unknown[]>('/api/v1/projects'),
    create: (data: Record<string, unknown>) =>
      request<unknown>('/api/v1/projects', { method: 'POST', body: JSON.stringify(data) }),
  },
  teamMembers: {
    list: () => request<unknown[]>('/api/v1/team-members'),
    create: (data: Record<string, unknown>) =>
      request<unknown>('/api/v1/team-members', { method: 'POST', body: JSON.stringify(data) }),
  },
  tags: {
    list: () => request<unknown[]>('/api/v1/tags'),
    create: (data: Record<string, unknown>) =>
      request<unknown>('/api/v1/tags', { method: 'POST', body: JSON.stringify(data) }),
  },
  timeEntries: {
    list: () => request<unknown[]>('/api/v1/time-entries'),
    create: (data: Record<string, unknown>) =>
      request<unknown>('/api/v1/time-entries', { method: 'POST', body: JSON.stringify(data) }),
  },
}
