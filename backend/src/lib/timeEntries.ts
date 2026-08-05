export const timeEntryStatuses = ['running', 'pending', 'approved', 'rejected', 'invoiced'] as const
export type TimeEntryStatus = (typeof timeEntryStatuses)[number]

export const FINALIZED_STATUSES = ['approved', 'invoiced'] as const

export const EDIT_POLICY_WINDOW_DAYS = 7

const DAY_MS = 24 * 60 * 60 * 1000

export function isTimeEntryStatus(value: unknown): value is TimeEntryStatus {
  return typeof value === 'string' && (timeEntryStatuses as readonly string[]).includes(value)
}

export function isFinalized(status: unknown): boolean {
  return typeof status === 'string' && (FINALIZED_STATUSES as readonly string[]).includes(status)
}

export function isPending(status: unknown): boolean {
  return status === 'pending'
}

export function reviewBlockReason(status: unknown): string | null {
  if (status === 'running') return 'Stop the timer before reviewing this entry'
  if (status === 'approved' || status === 'invoiced') return 'Finalized entries (approved/invoiced) cannot be reviewed'
  if (status === 'rejected') return 'Rejected entries must be edited and resubmitted before review'
  return null
}

export function isWithinEditWindow(entry: { createdAt?: Date | null }, now: Date = new Date(), windowDays: number = EDIT_POLICY_WINDOW_DAYS): boolean {
  if (!entry.createdAt) return true
  const age = now.getTime() - new Date(entry.createdAt).getTime()
  return age < windowDays * DAY_MS
}

export interface EntryFilters {
  dateFrom?: Date
  dateTo?: Date
  projectId?: string
  status?: TimeEntryStatus
  userId?: string
}

export function parseDateOnly(value: string): Date {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${value}`)
  return d
}

export function buildEntryFilters(qs: Record<string, string | undefined>): EntryFilters {
  const filters: EntryFilters = {}
  if (qs.dateFrom) {
    const d = parseDateOnly(qs.dateFrom)
    d.setHours(0, 0, 0, 0)
    filters.dateFrom = d
  }
  if (qs.dateTo) {
    const d = parseDateOnly(qs.dateTo)
    d.setHours(23, 59, 59, 999)
    filters.dateTo = d
  }
  if (qs.projectId) filters.projectId = qs.projectId
  if (qs.status) {
    if (!isTimeEntryStatus(qs.status)) throw new Error(`Invalid status: ${qs.status}`)
    filters.status = qs.status
  }
  if (qs.userId) filters.userId = qs.userId
  return filters
}
