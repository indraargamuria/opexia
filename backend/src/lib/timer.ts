export const MAX_TIMER_HOURS = 12
export const ADMIN_MAX_TIMER_HOURS = 24

const MIN_TIMER_MS = 60 * 1000
const HOUR_MS = 60 * 60 * 1000

export function isUnderMinDuration(startedAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - new Date(startedAt).getTime() < MIN_TIMER_MS
}

export function isOverdue(startedAt: Date, now: Date = new Date(), maxHours: number = MAX_TIMER_HOURS): boolean {
  return now.getTime() - new Date(startedAt).getTime() > maxHours * HOUR_MS
}

export function maxDurationMinutes(maxHours: number = MAX_TIMER_HOURS): number {
  return maxHours * 60
}
