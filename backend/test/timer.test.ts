import { describe, it, expect } from 'vitest'
import {
  isUnderMinDuration,
  isOverdue,
  maxDurationMinutes,
  MAX_TIMER_HOURS,
  ADMIN_MAX_TIMER_HOURS,
} from '../src/lib/timer.ts'

const MINUTE = 60 * 1000
const HOUR = 60 * 60 * 1000

describe('isUnderMinDuration', () => {
  it('flags sub-minute runs', () => {
    const startedAt = new Date(Date.now() - 30 * 1000)
    expect(isUnderMinDuration(startedAt)).toBe(true)
  })

  it('allows runs of at least a minute', () => {
    const startedAt = new Date(Date.now() - 2 * MINUTE)
    expect(isUnderMinDuration(startedAt)).toBe(false)
  })
})

describe('isOverdue', () => {
  it('flags runs past the 12h max', () => {
    const startedAt = new Date(Date.now() - 13 * HOUR)
    expect(isOverdue(startedAt)).toBe(true)
  })

  it('allows runs within the max', () => {
    const startedAt = new Date(Date.now() - 11 * HOUR)
    expect(isOverdue(startedAt)).toBe(false)
  })

  it('respects a custom max', () => {
    const startedAt = new Date(Date.now() - 13 * HOUR)
    expect(isOverdue(startedAt, new Date(), 24)).toBe(false)
  })
})

describe('duration policy', () => {
  it('caps auto-stop duration at the max hours', () => {
    expect(maxDurationMinutes()).toBe(MAX_TIMER_HOURS * 60)
    expect(MAX_TIMER_HOURS).toBe(12)
    expect(maxDurationMinutes(ADMIN_MAX_TIMER_HOURS)).toBe(24 * 60)
    expect(ADMIN_MAX_TIMER_HOURS).toBe(24)
  })
})
