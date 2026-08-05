import { describe, it, expect } from 'vitest'
import { canTransition, isValidDateRange, budgetUtilization } from '../src/lib/projects.ts'

describe('canTransition', () => {
  it('allows forward lifecycle transitions', () => {
    expect(canTransition('planning', 'active')).toBe(true)
    expect(canTransition('planning', 'on_hold')).toBe(true)
    expect(canTransition('active', 'completed')).toBe(true)
    expect(canTransition('completed', 'archived')).toBe(true)
    expect(canTransition('active', 'on_hold')).toBe(true)
    expect(canTransition('on_hold', 'active')).toBe(true)
  })

  it('rejects invalid or backward transitions', () => {
    expect(canTransition('planning', 'archived')).toBe(false)
    expect(canTransition('planning', 'completed')).toBe(false)
    expect(canTransition('archived', 'active')).toBe(false)
    expect(canTransition('completed', 'active')).toBe(false)
    expect(canTransition('archived', 'completed')).toBe(false)
    expect(canTransition('archived', 'archived')).toBe(false)
  })

  it('rejects unknown statuses', () => {
    expect(canTransition('foo', 'active')).toBe(false)
    expect(canTransition('planning', 'foo')).toBe(false)
  })
})

describe('isValidDateRange', () => {
  it('accepts end dates on or after the start date', () => {
    expect(isValidDateRange('2026-01-01', '2026-01-31')).toBe(true)
    expect(isValidDateRange('2026-01-01', '2026-01-01')).toBe(true)
  })

  it('rejects end dates before the start date', () => {
    expect(isValidDateRange('2026-01-31', '2026-01-01')).toBe(false)
  })

  it('accepts missing dates', () => {
    expect(isValidDateRange(null, null)).toBe(true)
    expect(isValidDateRange('2026-01-01', null)).toBe(true)
    expect(isValidDateRange(undefined, '2026-01-01')).toBe(true)
  })
})

describe('budgetUtilization', () => {
  it('returns normal for no budget', () => {
    expect(budgetUtilization(50, null)).toEqual({ percentage: 0, level: 'normal' })
    expect(budgetUtilization(50, 0)).toEqual({ percentage: 0, level: 'normal' })
  })

  it('flags attention at 75%', () => {
    expect(budgetUtilization(75, 100)).toEqual({ percentage: 75, level: 'attention' })
  })

  it('flags warning at 90%', () => {
    expect(budgetUtilization(90, 100)).toEqual({ percentage: 90, level: 'warning' })
  })

  it('flags critical at 100% and above', () => {
    expect(budgetUtilization(100, 100)).toEqual({ percentage: 100, level: 'critical' })
    expect(budgetUtilization(120, 100).level).toBe('critical')
  })

  it('caps percentage at 100', () => {
    expect(budgetUtilization(200, 100).percentage).toBe(100)
  })
})
