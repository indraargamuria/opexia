export type BudgetLevel = 'normal' | 'warning' | 'critical'

export function budgetPercentage(loggedHours: number, budgetHours: number): number {
  if (!budgetHours || budgetHours <= 0) return 0
  return Math.min((loggedHours / budgetHours) * 100, 100)
}

export function budgetLevel(percentage: number): BudgetLevel {
  if (percentage >= 100) return 'critical'
  if (percentage >= 90) return 'warning'
  return 'normal'
}
