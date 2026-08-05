import { describe, it, expect } from 'vitest'
import {
  isTimeEntryStatus,
  isFinalized,
  isWithinEditWindow,
  buildEntryFilters,
  reviewBlockReason,
  EDIT_POLICY_WINDOW_DAYS,
} from '../src/lib/timeEntries.ts'

describe('isTimeEntryStatus', () => {
  it('accepts all documented statuses and rejects others', () => {
    expect(isTimeEntryStatus('running')).toBe(true)
    expect(isTimeEntryStatus('pending')).toBe(true)
    expect(isTimeEntryStatus('approved')).toBe(true)
    expect(isTimeEntryStatus('rejected')).toBe(true)
    expect(isTimeEntryStatus('invoiced')).toBe(true)
    expect(isTimeEntryStatus('archived')).toBe(false)
    expect(isTimeEntryStatus(null)).toBe(false)
  })
})

describe('isFinalized', () => {
  it('locks approved and invoiced entries', () => {
    expect(isFinalized('approved')).toBe(true)
    expect(isFinalized('invoiced')).toBe(true)
    expect(isFinalized('pending')).toBe(false)
    expect(isFinalized('rejected')).toBe(false)
  })
})

describe('isWithinEditWindow', () => {
  const now = new Date('2026-08-05T12:00:00Z')

  it('allows edits inside the policy window', () => {
    const entry = { createdAt: new Date('2026-08-04T12:00:00Z') }
    expect(isWithinEditWindow(entry, now)).toBe(true)
  })

  it('blocks edits outside the policy window', () => {
    const entry = { createdAt: new Date('2026-07-01T12:00:00Z') }
    expect(isWithinEditWindow(entry, now)).toBe(false)
  })

  it('respects a custom window in days', () => {
    const entry = { createdAt: new Date('2026-08-03T12:00:00Z') }
    expect(isWithinEditWindow(entry, now, 1)).toBe(false)
    expect(isWithinEditWindow(entry, now, 5)).toBe(true)
  })

  it('treats missing createdAt as editable', () => {
    expect(isWithinEditWindow({ createdAt: null }, now)).toBe(true)
  })

  it('default window is the documented policy', () => {
    expect(EDIT_POLICY_WINDOW_DAYS).toBe(7)
  })
})

describe('buildEntryFilters', () => {
  it('maps date bounds to start/end of day', () => {
    const f = buildEntryFilters({ dateFrom: '2026-08-01', dateTo: '2026-08-05' })
    expect(f.dateFrom!.getFullYear()).toBe(2026)
    expect(f.dateFrom!.getMonth()).toBe(7)
    expect(f.dateFrom!.getDate()).toBe(1)
    expect(f.dateFrom!.getHours()).toBe(0)
    expect(f.dateTo!.getDate()).toBe(5)
    expect(f.dateTo!.getHours()).toBe(23)
  })

  it('passes through project/status/user filters', () => {
    const f = buildEntryFilters({ projectId: 'p1', status: 'pending', userId: 'u1' })
    expect(f).toMatchObject({ projectId: 'p1', status: 'pending', userId: 'u1' })
  })

  it('returns an empty object when no filters given', () => {
    expect(buildEntryFilters({})).toEqual({})
  })

  it('throws on malformed dates and statuses', () => {
    expect(() => buildEntryFilters({ dateFrom: 'not-a-date' })).toThrow()
    expect(() => buildEntryFilters({ status: 'bogus' })).toThrow()
  })
})

describe('reviewBlockReason', () => {
  it('allows review of pending entries only', () => {
    expect(reviewBlockReason('pending')).toBeNull()
    expect(reviewBlockReason('running')).toMatch(/stop the timer/i)
    expect(reviewBlockReason('approved')).toMatch(/finalized/i)
    expect(reviewBlockReason('invoiced')).toMatch(/finalized/i)
    expect(reviewBlockReason('rejected')).toMatch(/resubmitted/i)
  })
})
