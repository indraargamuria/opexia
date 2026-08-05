import { describe, it, expect } from 'vitest'
import { isValidClientCode, isUniqueViolation } from '../src/lib/validators.ts'

describe('isValidClientCode', () => {
  it('accepts alphanumeric and hyphen codes', () => {
    expect(isValidClientCode('acme-co')).toBe(true)
    expect(isValidClientCode('ACME123')).toBe(true)
    expect(isValidClientCode('a-b-c-9')).toBe(true)
  })

  it('rejects spaces, underscores, dots, and empty strings', () => {
    expect(isValidClientCode('acme co')).toBe(false)
    expect(isValidClientCode('acme_co')).toBe(false)
    expect(isValidClientCode('acme.co')).toBe(false)
    expect(isValidClientCode('')).toBe(false)
  })
})

describe('isUniqueViolation', () => {
  it('detects unique constraint failures', () => {
    expect(isUniqueViolation(new Error('UNIQUE constraint failed: clients.code'))).toBe(true)
    expect(isUniqueViolation(new Error('UNIQUE constraint failed: clients.name'))).toBe(true)
  })

  it('returns false for other errors and non-errors', () => {
    expect(isUniqueViolation(new Error('boom'))).toBe(false)
    expect(isUniqueViolation(null)).toBe(false)
  })
})
