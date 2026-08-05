export const projectStatuses = ['planning', 'active', 'on_hold', 'completed', 'archived'] as const

export type ProjectStatus = (typeof projectStatuses)[number]

const TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  planning: ['active', 'on_hold'],
  active: ['on_hold', 'completed'],
  on_hold: ['active', 'completed'],
  completed: ['archived'],
  archived: [],
}

export const creatableProjectStatuses: ProjectStatus[] = ['planning', 'active', 'on_hold']

export function canTransition(from: string, to: string): boolean {
  const allowed = TRANSITIONS[from as ProjectStatus] ?? []
  return allowed.includes(to as ProjectStatus)
}

export function isValidDateRange(startDate: string | null | undefined, endDate: string | null | undefined): boolean {
  if (!startDate || !endDate) return true
  return new Date(endDate).getTime() >= new Date(startDate).getTime()
}

export type BudgetLevel = 'normal' | 'attention' | 'warning' | 'critical'

export function budgetUtilization(loggedHours: number, budgetHours: number | null | undefined): {
  percentage: number
  level: BudgetLevel
} {
  if (!budgetHours || budgetHours <= 0) {
    return { percentage: 0, level: 'normal' }
  }
  const pct = (loggedHours / budgetHours) * 100
  if (pct >= 100) return { percentage: 100, level: 'critical' }
  if (pct >= 90) return { percentage: pct, level: 'warning' }
  if (pct >= 75) return { percentage: pct, level: 'attention' }
  return { percentage: pct, level: 'normal' }
}
