import { describe, it, expect } from 'vitest'
import { periodRange, toISODate, utilizationLevel, utilizationBarClass, utilizationTextClass } from '@/lib/period'

describe('toISODate', () => {
  it('formats local date parts as YYYY-MM-DD', () => {
    expect(toISODate(new Date(2026, 7, 5))).toBe('2026-08-05')
    expect(toISODate(new Date(2026, 0, 9))).toBe('2026-01-09')
  })
})

describe('periodRange', () => {
  const now = new Date(2026, 7, 5, 15, 30) // Wed Aug 5 2026

  it('week starts Monday of the current week', () => {
    expect(periodRange('week', now)).toMatchObject({ dateFrom: '2026-08-03', dateTo: '2026-08-05' })
  })

  it('month starts on the first day', () => {
    expect(periodRange('month', now)).toMatchObject({ dateFrom: '2026-08-01', dateTo: '2026-08-05' })
  })

  it('quarter starts on the first month of the quarter', () => {
    expect(periodRange('quarter', new Date(2026, 7, 5))).toMatchObject({ dateFrom: '2026-07-01' })
    expect(periodRange('quarter', new Date(2026, 1, 5))).toMatchObject({ dateFrom: '2026-01-01' })
    expect(periodRange('quarter', new Date(2026, 11, 5))).toMatchObject({ dateFrom: '2026-10-01' })
  })

  it('labels match the requested period', () => {
    expect(periodRange('week', now).label).toBe('week')
    expect(periodRange('month', now).label).toBe('month')
  })
})

describe('utilization thresholds', () => {
  it('brand below 90, warning at 90+, error at 100', () => {
    expect(utilizationLevel(0)).toBe('normal')
    expect(utilizationLevel(89.9)).toBe('normal')
    expect(utilizationLevel(90)).toBe('warning')
    expect(utilizationLevel(99)).toBe('warning')
    expect(utilizationLevel(100)).toBe('critical')
    expect(utilizationLevel(120)).toBe('critical')
  })

  it('maps levels to bar and text classes', () => {
    expect(utilizationBarClass('normal')).toBe('bg-brand')
    expect(utilizationBarClass('warning')).toBe('bg-warning')
    expect(utilizationBarClass('critical')).toBe('bg-error')
    expect(utilizationTextClass('normal')).toBe('text-success')
    expect(utilizationTextClass('warning')).toBe('text-warning')
    expect(utilizationTextClass('critical')).toBe('text-error')
  })
})
