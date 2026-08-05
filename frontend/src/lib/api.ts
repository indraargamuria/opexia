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
  clients: {
    list: () => request<unknown[]>('/api/v1/clients'),
    create: (data: Record<string, unknown>) =>
      request<unknown>('/api/v1/clients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<unknown>(`/api/v1/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) =>
      request<unknown>(`/api/v1/clients/${id}`, { method: 'DELETE' }),
  },
  projects: {
    list: () => request<unknown[]>('/api/v1/projects'),
    create: (data: Record<string, unknown>) =>
      request<unknown>('/api/v1/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<unknown>(`/api/v1/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) =>
      request<unknown>(`/api/v1/projects/${id}`, { method: 'DELETE' }),
  },
  users: {
    list: () => request<unknown[]>('/api/v1/users'),
  },
  teamMembers: {
    list: () => request<unknown[]>('/api/v1/team-members'),
    create: (data: Record<string, unknown>) =>
      request<unknown>('/api/v1/team-members', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<unknown>(`/api/v1/team-members/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) =>
      request<unknown>(`/api/v1/team-members/${id}`, { method: 'DELETE' }),
  },
  tags: {
    list: () => request<unknown[]>('/api/v1/tags'),
    create: (data: Record<string, unknown>) =>
      request<unknown>('/api/v1/tags', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<unknown>(`/api/v1/tags/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) =>
      request<unknown>(`/api/v1/tags/${id}`, { method: 'DELETE' }),
  },
  timeEntries: {
    list: () => request<unknown[]>('/api/v1/time-entries'),
    create: (data: Record<string, unknown>) =>
      request<unknown>('/api/v1/time-entries', { method: 'POST', body: JSON.stringify(data) }),
  },
  timer: {
    start: (data: { userId: string; projectId: string; description?: string }) =>
      request<unknown>('/api/v1/timer/start', { method: 'POST', body: JSON.stringify(data) }),
    stop: (data: { userId: string }) =>
      request<unknown>('/api/v1/timer/stop', { method: 'POST', body: JSON.stringify(data) }),
    current: (userId: string) =>
      request<unknown>(`/api/v1/timer/current?userId=${encodeURIComponent(userId)}`),
  },
}
