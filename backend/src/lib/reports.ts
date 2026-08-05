import { budgetUtilization } from './projects'

export const WEEKLY_TARGET_HOURS = 40
export const DEFAULT_REPORT_WINDOW_DAYS = 90

export function weekBounds(now: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(now)
  const mondayOffset = (now.getDay() + 6) % 7
  start.setHours(0, 0, 0, 0)
  start.setDate(now.getDate() - mondayOffset)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { start, end }
}

export function utilizationPercent(totalMinutes: number, targetHours: number = WEEKLY_TARGET_HOURS): number {
  if (targetHours <= 0) return 0
  return Math.min(Math.round((totalMinutes / (targetHours * 60)) * 100), 100)
}

export function roundedHours(totalMinutes: number): number {
  return Math.round((totalMinutes / 60) * 10) / 10
}

export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function parseDateParam(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? fallback : d
}

export interface ReportPeriod {
  start: Date
  end: Date
  dateFrom: string
  dateTo: string
}

export function reportWindow(
  dateFrom?: string,
  dateTo?: string,
  now: Date = new Date(),
): ReportPeriod {
  const endDefault = new Date(now)
  endDefault.setHours(23, 59, 59, 999)
  const startDefault = new Date(now)
  startDefault.setDate(now.getDate() - (DEFAULT_REPORT_WINDOW_DAYS - 1))
  startDefault.setHours(0, 0, 0, 0)
  const start = parseDateParam(dateFrom, startDefault)
  const end = parseDateParam(dateTo, endDefault)
  if (end.getTime() < start.getTime()) {
    throw new RangeError('dateTo must be on or after dateFrom')
  }
  const endExclusive = new Date(end)
  endExclusive.setDate(endExclusive.getDate() + 1)
  endExclusive.setHours(0, 0, 0, 0)
  return { start, end: endExclusive, dateFrom: toISODate(start), dateTo: toISODate(end) }
}

export function weeksInWindow(start: Date, end: Date): number {
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000))
  return Math.max(1, Math.round(days / 7))
}

export function costForMinutes(minutes: number, rate: number | null | undefined): number {
  return roundMoney((minutes / 60) * (rate ?? 0))
}

export function teamUtilizationPercent(
  totalMinutes: number,
  workerCount: number,
  weeks: number,
): number {
  if (workerCount <= 0 || weeks <= 0) return 0
  return utilizationPercent(totalMinutes, WEEKLY_TARGET_HOURS * workerCount * weeks)
}

export type EntryRateMap = Record<string, number | null | undefined>

export interface EntryLike {
  userId: string
  durationMinutes: number | null
}

export function aggregateEntries(
  entries: EntryLike[],
  rates: EntryRateMap,
  fallbackRate: number | null | undefined,
): { minutes: number; hours: number; count: number; cost: number } {
  let minutes = 0
  let count = 0
  let cost = 0
  for (const entry of entries) {
    const m = entry.durationMinutes ?? 0
    if (m <= 0) continue
    minutes += m
    count += 1
    cost += costForMinutes(m, rates[entry.userId] ?? fallbackRate)
  }
  return { minutes, count, hours: roundedHours(minutes), cost }
}

export interface BudgetReportInput {
  budgetHours: number | null | undefined
  budgetCost: number | null | undefined
  loggedHours: number
  actualCost: number
}

export function budgetReport(input: BudgetReportInput) {
  const { budgetHours, budgetCost, loggedHours, actualCost } = input
  return {
    budgetHours: budgetHours ?? null,
    budgetCost: budgetCost ?? null,
    loggedHours,
    utilization: budgetUtilization(loggedHours, budgetHours),
    actualCost,
    variance: budgetCost == null ? null : roundMoney(budgetCost - actualCost),
  }
}
