export const WORKSPACE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD'] as const
export type Currency = (typeof CURRENCIES)[number]

export const APPROVAL_LEVELS = ['all', 'billable', 'manual', 'disabled'] as const
export type ApprovalLevel = (typeof APPROVAL_LEVELS)[number]

export const EXPORT_FORMATS = ['sap', 'oracle', 'workday', 'custom'] as const
export type ExportFormat = (typeof EXPORT_FORMATS)[number]

export const DEFAULT_NAME = 'Opexia Consulting'
export const DEFAULT_SLUG = 'opexia-consulting'
export const DEFAULT_CURRENCY: Currency = 'USD'
export const DEFAULT_TIMEZONE = 'UTC'
export const DEFAULT_APPROVAL_LEVEL: ApprovalLevel = 'all'
export const DEFAULT_MANUAL_ENTRY_WINDOW_DAYS = 7
export const DEFAULT_MAX_TIMER_HOURS = 12

export const MIN_MANUAL_WINDOW_DAYS = 0
export const MAX_MANUAL_WINDOW_DAYS = 90
export const MIN_MAX_TIMER_HOURS = 1
export const MAX_MAX_TIMER_HOURS = 24

export function isValidSlug(value: unknown): value is string {
  if (typeof value !== 'string') return false
  return value.length >= 2 && value.length <= 50 && WORKSPACE_SLUG_RE.test(value)
}

export function isValidCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && (CURRENCIES as readonly string[]).includes(value)
}

export function isValidTimezone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

export function isValidApprovalLevel(value: unknown): value is ApprovalLevel {
  return typeof value === 'string' && (APPROVAL_LEVELS as readonly string[]).includes(value)
}

export function isValidExportFormat(value: unknown): value is ExportFormat {
  return typeof value === 'string' && (EXPORT_FORMATS as readonly string[]).includes(value)
}

export function isValidManualEntryWindowDays(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= MIN_MANUAL_WINDOW_DAYS
    && value <= MAX_MANUAL_WINDOW_DAYS
}

export function isValidMaxTimerHours(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= MIN_MAX_TIMER_HOURS
    && value <= MAX_MAX_TIMER_HOURS
}
