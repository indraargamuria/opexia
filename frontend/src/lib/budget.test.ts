import { describe, it, expect } from 'vitest'
import { budgetPercentage, budgetLevel } from '@/lib/budget'

describe('budgetPercentage', () => {
  it('returns 0 when budget is missing or zero', () => {
    expect(budgetPercentage(40, 0)).toBe(0)
    expect(budgetPercentage(40, NaN)).toBe(0)
  })

  it('computes the ratio and caps at 100', () => {
    expect(budgetPercentage(25, 100)).toBe(25)
    expect(budgetPercentage(100, 100)).toBe(100)
    expect(budgetPercentage(150, 100)).toBe(100)
  })
})

describe('budgetLevel', () => {
  it('is normal below 90%', () => {
    expect(budgetLevel(0)).toBe('normal')
    expect(budgetLevel(89.9)).toBe('normal')
  })

  it('is warning from 90%', () => {
    expect(budgetLevel(90)).toBe('warning')
    expect(budgetLevel(99)).toBe('warning')
  })

  it('is critical at 100%', () => {
    expect(budgetLevel(100)).toBe('critical')
  })
})
