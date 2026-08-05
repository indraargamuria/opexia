import { describe, it, expect } from 'vitest'
import {
  isValidSlug,
  isValidCurrency,
  isValidTimezone,
  isValidApprovalLevel,
  isValidExportFormat,
  isValidManualEntryWindowDays,
  isValidMaxTimerHours,
  WORKSPACE_SLUG_RE,
} from '../src/lib/settings.ts'

describe('isValidSlug', () => {
  it('accepts kebab-case slugs', () => {
    expect(isValidSlug('opexia-consulting')).toBe(true)
    expect(isValidSlug('acme')).toBe(true)
    expect(isValidSlug('a1-b2-c3')).toBe(true)
    expect(WORKSPACE_SLUG_RE.test('a1-b2-c3')).toBe(true)
  })

  it('rejects invalid slugs', () => {
    expect(isValidSlug('Acme')).toBe(false)
    expect(isValidSlug('acme_')).toBe(false)
    expect(isValidSlug('-acme')).toBe(false)
    expect(isValidSlug('acme-')).toBe(false)
    expect(isValidSlug('a')).toBe(false)
    expect(isValidSlug('a'.repeat(51))).toBe(false)
    expect(isValidSlug('')).toBe(false)
    expect(isValidSlug(123)).toBe(false)
  })
})

describe('isValidCurrency', () => {
  it('accepts USD/EUR/GBP/CAD', () => {
    for (const c of ['USD', 'EUR', 'GBP', 'CAD']) expect(isValidCurrency(c)).toBe(true)
  })

  it('rejects lowercase or unknown codes', () => {
    expect(isValidCurrency('usd')).toBe(false)
    expect(isValidCurrency('XYZ')).toBe(false)
    expect(isValidCurrency(null)).toBe(false)
  })
})

describe('isValidTimezone', () => {
  it('accepts IANA timezones', () => {
    expect(isValidTimezone('UTC')).toBe(true)
    expect(isValidTimezone('America/New_York')).toBe(true)
    expect(isValidTimezone('Asia/Jakarta')).toBe(true)
  })

  it('rejects invalid timezones', () => {
    expect(isValidTimezone('Not/AZone')).toBe(false)
    expect(isValidTimezone('')).toBe(false)
    expect(isValidTimezone(42)).toBe(false)
  })
})

describe('approval + export enums', () => {
  it('accepts valid approval levels only', () => {
    for (const v of ['all', 'billable', 'manual', 'disabled']) expect(isValidApprovalLevel(v)).toBe(true)
    expect(isValidApprovalLevel('everything')).toBe(false)
    expect(isValidApprovalLevel(undefined)).toBe(false)
  })

  it('accepts valid export formats only', () => {
    for (const v of ['sap', 'oracle', 'workday', 'custom']) expect(isValidExportFormat(v)).toBe(true)
    expect(isValidExportFormat('pdf')).toBe(false)
  })
})

describe('policy numeric constraints', () => {
  it('manual entry window must be an integer 0..90', () => {
    expect(isValidManualEntryWindowDays(0)).toBe(true)
    expect(isValidManualEntryWindowDays(7)).toBe(true)
    expect(isValidManualEntryWindowDays(90)).toBe(true)
    expect(isValidManualEntryWindowDays(-1)).toBe(false)
    expect(isValidManualEntryWindowDays(91)).toBe(false)
    expect(isValidManualEntryWindowDays(1.5)).toBe(false)
    expect(isValidManualEntryWindowDays('7')).toBe(false)
  })

  it('max timer duration must be an integer 1..24', () => {
    expect(isValidMaxTimerHours(1)).toBe(true)
    expect(isValidMaxTimerHours(12)).toBe(true)
    expect(isValidMaxTimerHours(24)).toBe(true)
    expect(isValidMaxTimerHours(0)).toBe(false)
    expect(isValidMaxTimerHours(25)).toBe(false)
    expect(isValidMaxTimerHours(12.5)).toBe(false)
  })
})
