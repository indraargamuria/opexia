import { describe, it, expect } from 'vitest'
import { weekBounds, utilizationPercent, roundedHours, WEEKLY_TARGET_HOURS } from '../src/lib/reports.ts'

describe('weekBounds', () => {
  it('starts the week on Monday at midnight', () => {
    const { start, end } = weekBounds(new Date('2026-08-05T15:30:00Z')) // Wednesday
    expect(start.getDay()).toBe(1)
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(end.getTime() - start.getTime()).toBe(7 * 24 * 60 * 60 * 1000)
  })

  it('treats Monday itself as the week start', () => {
    const { start, end } = weekBounds(new Date('2026-08-03T10:00:00Z')) // Monday
    expect(start.toDateString()).toBe(new Date('2026-08-03T10:00:00Z').toDateString())
    expect(end.getDay()).toBe(1)
  })

  it('always yields a 7-day window', () => {
    for (let i = 0; i < 7; i++) {
      const { start, end } = weekBounds(new Date(2026, 7, 3 + i, 12))
      expect(end.getTime() - start.getTime()).toBe(7 * 24 * 60 * 60 * 1000)
    }
  })
})

describe('utilizationPercent', () => {
  it('returns 0 for no logged time', () => {
    expect(utilizationPercent(0)).toBe(0)
  })

  it('computes against the weekly target', () => {
    expect(utilizationPercent(34 * 60)).toBe(85)
    expect(utilizationPercent(20 * 60)).toBe(50)
  })

  it('caps at 100', () => {
    expect(utilizationPercent(60 * 60)).toBe(100)
  })

  it('documents the target', () => {
    expect(WEEKLY_TARGET_HOURS).toBe(40)
  })
})

describe('roundedHours', () => {
  it('converts minutes to a single-decimal hour value', () => {
    expect(roundedHours(150)).toBe(2.5)
    expect(roundedHours(0)).toBe(0)
    expect(roundedHours(97)).toBe(1.6)
  })
})
