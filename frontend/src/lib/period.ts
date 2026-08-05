export type PeriodKey = 'week' | 'month' | 'quarter' | 'custom'

export interface PeriodRange {
  dateFrom: string
  dateTo: string
  label: string
}

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function periodRange(key: Exclude<PeriodKey, 'custom'>, now: Date = new Date()): PeriodRange {
  const end = new Date(now)
  const start = new Date(now)

  if (key === 'week') {
    const mondayOffset = (now.getDay() + 6) % 7
    start.setDate(now.getDate() - mondayOffset)
    start.setHours(0, 0, 0, 0)
  } else if (key === 'month') {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
  } else {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3
    start.setMonth(quarterStartMonth, 1)
    start.setHours(0, 0, 0, 0)
  }

  return { dateFrom: toISODate(start), dateTo: toISODate(end), label: key }
}

export type UtilizationLevel = 'normal' | 'warning' | 'critical'

export function utilizationLevel(pct: number): UtilizationLevel {
  if (pct >= 100) return 'critical'
  if (pct >= 90) return 'warning'
  return 'normal'
}

export function utilizationBarClass(level: UtilizationLevel): string {
  if (level === 'critical') return 'bg-error'
  if (level === 'warning') return 'bg-warning'
  return 'bg-brand'
}

export function utilizationTextClass(level: UtilizationLevel): string {
  if (level === 'critical') return 'text-error'
  if (level === 'warning') return 'text-warning'
  return 'text-success'
}
