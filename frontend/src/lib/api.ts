import { buildQueryString } from '@/lib/query'
import { getSession } from '@/lib/session'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3700'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': getSession().id,
      ...init?.headers,
    },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.json()
}

function filenameFromDisposition(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback
  const match = disposition.match(/filename="?([^";]+)"?/i)
  return match ? match[1] : fallback
}

export async function downloadReport(format: 'xlsx' | 'csv', params?: PeriodParams): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/reports/export?format=${format}${buildQueryString(params ?? {})}`, {
    headers: { 'X-User-Id': getSession().id },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API error ${res.status}: ${text}`)
  }
  const filename = filenameFromDisposition(res.headers.get('content-disposition'), `opexia-time-entries.${format}`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export interface WeeklyReport {
  userId: string
  weekStart: string
  weekEnd: string
  weeklyTotalMinutes: number
  weeklyTotalHours: number
  utilizationPercent: number
  activeProjects: number
}

export type PeriodParams = {
  dateFrom?: string
  dateTo?: string
}

export interface BudgetView {
  budgetHours: number | null
  budgetCost: number | null
  loggedHours: number
  utilization: { percentage: number; level: string }
  actualCost: number
  variance: number | null
}

export interface TagRollup {
  tagId: string
  name: string
  color: string | null
  category: string | null
  minutes: number
  hours: number
  count: number
  cost: number
}

export interface ProjectReport {
  projectId: string
  project: { id: string; name: string; code: string; status: string; client: { id: string; name: string } | null }
  period: { dateFrom: string; dateTo: string }
  totals: { minutes: number; hours: number; count: number; cost: number }
  budget: BudgetView
  byTag: TagRollup[]
}

export interface ClientReport {
  clientId: string
  client: { id: string; name: string; code: string }
  period: { dateFrom: string; dateTo: string }
  totals: { minutes: number; hours: number; count: number; cost: number }
  projectCount: number
  workerCount: number
  weeks: number
  utilizationPercent: number
  byProject: {
    projectId: string
    name: string
    status: string
    minutes: number
    hours: number
    cost: number
    budgetUtilization: { percentage: number; level: string }
  }[]
}

export interface TeamReport {
  period: { dateFrom: string; dateTo: string }
  weeks: number
  members: {
    userId: string
    name: string
    email: string | null
    role: string
    minutes: number
    hours: number
    count: number
    projectCount: number
    utilizationPercent: number
  }[]
  teamTotals: { minutes: number; hours: number; activeWorkerCount: number; averageUtilizationPercent: number }
}

export type ApprovalLevel = 'all' | 'billable' | 'manual' | 'disabled'
export type ExportFormat = 'sap' | 'oracle' | 'workday' | 'custom'

export interface WorkspaceSettings {
  id: string
  name: string
  slug: string
  currency: string
  timezone: string
  createdAt?: string
  updatedAt?: string
}

export interface ApprovalPolicy {
  id: string
  approvalLevel: ApprovalLevel
  manualEntryWindowDays: number
  maxTimerHours: number
  createdAt?: string
  updatedAt?: string
}

export interface ErpConfig {
  id: string
  exportFormat: ExportFormat
  costCenterMappingEnabled: boolean
  createdAt?: string
  updatedAt?: string
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
    list: (params?: Record<string, string | undefined>) =>
      request<unknown[]>(`/api/v1/time-entries${buildQueryString(params ?? {})}`),
    create: (data: Record<string, unknown>) =>
      request<unknown>('/api/v1/time-entries', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Record<string, unknown>) =>
      request<unknown>(`/api/v1/time-entries/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    approve: (id: string, actorId: string) =>
      request<unknown>(`/api/v1/time-entries/${id}/approve`, { method: 'POST', body: JSON.stringify({ actorId }) }),
    reject: (id: string, actorId: string, rejectionReason: string) =>
      request<unknown>(`/api/v1/time-entries/${id}/reject`, { method: 'POST', body: JSON.stringify({ actorId, rejectionReason }) }),
    approveBatch: (actorId: string, ids: string[]) =>
      request<{ approved: unknown[]; skipped: { id: string; reason: string }[] }>('/api/v1/time-entries/approve-batch', { method: 'POST', body: JSON.stringify({ actorId, ids }) }),
  },
  timer: {
    start: (data: { userId: string; projectId: string; description?: string }) =>
      request<unknown>('/api/v1/timer/start', { method: 'POST', body: JSON.stringify(data) }),
    stop: (data: { userId: string }) =>
      request<unknown>('/api/v1/timer/stop', { method: 'POST', body: JSON.stringify(data) }),
    current: (userId: string) =>
      request<unknown>(`/api/v1/timer/current?userId=${encodeURIComponent(userId)}`),
  },
  reports: {
    me: (userId: string) =>
      request<WeeklyReport>(`/api/v1/reports/me?userId=${encodeURIComponent(userId)}`),
    project: (id: string, params?: PeriodParams) =>
      request<ProjectReport>(`/api/v1/reports/project/${id}${buildQueryString(params ?? {})}`),
    client: (id: string, params?: PeriodParams) =>
      request<ClientReport>(`/api/v1/reports/client/${id}${buildQueryString(params ?? {})}`),
    team: (params?: PeriodParams) =>
      request<TeamReport>(`/api/v1/reports/team${buildQueryString(params ?? {})}`),
  },
  settings: {
    workspace: () => request<WorkspaceSettings>('/api/v1/workspace'),
    updateWorkspace: (data: Partial<Pick<WorkspaceSettings, 'name' | 'slug' | 'currency' | 'timezone'>>) =>
      request<WorkspaceSettings>('/api/v1/workspace', { method: 'PATCH', body: JSON.stringify(data) }),
    approvalPolicy: () => request<ApprovalPolicy>('/api/v1/approval-policy'),
    updateApprovalPolicy: (data: Partial<Pick<ApprovalPolicy, 'approvalLevel' | 'manualEntryWindowDays' | 'maxTimerHours'>>) =>
      request<ApprovalPolicy>('/api/v1/approval-policy', { method: 'PATCH', body: JSON.stringify(data) }),
    erpConfig: () => request<ErpConfig>('/api/v1/erp-config'),
    updateErpConfig: (data: Partial<Pick<ErpConfig, 'exportFormat' | 'costCenterMappingEnabled'>>) =>
      request<ErpConfig>('/api/v1/erp-config', { method: 'PATCH', body: JSON.stringify(data) }),
    wipe: () => request<{ ok: boolean }>('/api/v1/workspace', { method: 'DELETE' }),
  },
}
