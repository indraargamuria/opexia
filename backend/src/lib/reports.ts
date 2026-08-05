export const WEEKLY_TARGET_HOURS = 40

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
