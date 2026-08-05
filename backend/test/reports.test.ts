import { describe, it, expect } from 'vitest'
import {
  weekBounds,
  utilizationPercent,
  roundedHours,
  WEEKLY_TARGET_HOURS,
  DEFAULT_REPORT_WINDOW_DAYS,
  parseDateParam,
  reportWindow,
  weeksInWindow,
  roundMoney,
  costForMinutes,
  aggregateEntries,
  budgetReport,
  teamUtilizationPercent,
} from '../src/lib/reports.ts'

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

describe('reportWindow', () => {
  it('defaults to a 90-day rolling window when no range is given', () => {
    const now = new Date(2026, 7, 5, 12, 0, 0)
    const period = reportWindow(undefined, undefined, now)
    const spanDays = (period.end.getTime() - period.start.getTime()) / (24 * 60 * 60 * 1000)
    expect(Math.round(spanDays)).toBe(DEFAULT_REPORT_WINDOW_DAYS)
    expect(period.dateTo).toBe('2026-08-05')
    expect(period.start.getTime()).toBeLessThanOrEqual(now.getTime())
  })

  it('parses explicit dates and makes end exclusive (next-day midnight)', () => {
    const period = reportWindow('2026-07-01', '2026-07-31', new Date(2026, 7, 5, 12))
    expect(period.start.getTime()).toBe(new Date(2026, 6, 1).getTime())
    expect(period.end.getTime()).toBe(new Date(2026, 7, 1).getTime())
  })

  it('throws when dateTo precedes dateFrom', () => {
    expect(() => reportWindow('2026-08-01', '2026-07-01')).toThrow(/dateTo must be on or after dateFrom/)
  })

  it('falls back on unparseable params', () => {
    const now = new Date(2026, 7, 5, 12)
    const period = reportWindow('not-a-date', undefined, now)
    expect(period.start.getTime()).toBe(period.start.getTime())
  })

  it('documents the default window constant', () => {
    expect(DEFAULT_REPORT_WINDOW_DAYS).toBe(90)
  })
})

describe('parseDateParam', () => {
  it('parses YYYY-MM-DD at local midnight', () => {
    const fallback = new Date(2026, 0, 1)
    expect(parseDateParam('2026-06-15', fallback).getTime()).toBe(new Date(2026, 5, 15).getTime())
  })

  it('returns fallback for missing or invalid input', () => {
    const fallback = new Date(2026, 0, 1)
    expect(parseDateParam(undefined, fallback)).toBe(fallback)
    expect(parseDateParam('banana', fallback)).toBe(fallback)
  })
})

describe('weeksInWindow', () => {
  it('counts 7-day periods with a minimum of 1', () => {
    const day = 24 * 60 * 60 * 1000
    expect(weeksInWindow(new Date(0), new Date(0 + day))).toBe(1)
    expect(weeksInWindow(new Date(0), new Date(0 + 14 * day))).toBe(2)
    expect(weeksInWindow(new Date(0), new Date(0 + 90 * day))).toBe(13)
  })
})

describe('cost & money math', () => {
  it('rounds money to two decimals', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3)
    expect(roundMoney(123.456)).toBe(123.46)
  })

  it('computes cost from minutes and hourly rate', () => {
    expect(costForMinutes(90, 100)).toBe(150)
    expect(costForMinutes(60, 150)).toBe(150)
    expect(costForMinutes(30, null)).toBe(0)
    expect(costForMinutes(5, 100)).toBe(8.33)
  })
})

describe('aggregateEntries', () => {
  it('sums minutes, hours, count and cost using per-user rates', () => {
    const entries = [
      { userId: 'a', durationMinutes: 60 },
      { userId: 'b', durationMinutes: 30 },
      { userId: 'a', durationMinutes: 90 },
    ]
    const rates = { a: 100, b: 200 }
    const agg = aggregateEntries(entries, rates, 50)
    expect(agg.minutes).toBe(180)
    expect(agg.hours).toBe(3)
    expect(agg.count).toBe(3)
    expect(agg.cost).toBe(350)
  })

  it('falls back to the client rate for users without a team rate', () => {
    const agg = aggregateEntries([{ userId: 'a', durationMinutes: 60 }], {}, 150)
    expect(agg.cost).toBe(150)
  })

  it('skips zero-duration entries', () => {
    const agg = aggregateEntries([
      { userId: 'a', durationMinutes: 0 },
      { userId: 'b', durationMinutes: null },
    ], {}, 100)
    expect(agg).toEqual({ minutes: 0, hours: 0, count: 0, cost: 0 })
  })
})

describe('budgetReport', () => {
  it('reports utilization and variance against budget', () => {
    const report = budgetReport({ budgetHours: 100, budgetCost: 10000, loggedHours: 75, actualCost: 7500 })
    expect(report.utilization).toEqual({ percentage: 75, level: 'attention' })
    expect(report.variance).toBe(2500)
    expect(report.actualCost).toBe(7500)
  })

  it('nulls variance when no budget cost is set', () => {
    const report = budgetReport({ budgetHours: null, budgetCost: null, loggedHours: 5, actualCost: 500 })
    expect(report.variance).toBeNull()
    expect(report.utilization.level).toBe('normal')
  })
})

describe('teamUtilizationPercent', () => {
  it('scales target hours by worker count and window length', () => {
    expect(teamUtilizationPercent(40 * 60, 1, 1)).toBe(100)
    expect(teamUtilizationPercent(40 * 60, 2, 1)).toBe(50)
    expect(teamUtilizationPercent(80 * 60, 1, 2)).toBe(100)
  })

  it('returns 0 without workers', () => {
    expect(teamUtilizationPercent(60, 0, 1)).toBe(0)
  })
})
