import { describe, it, expect } from 'vitest'
import { isValidClientCode } from './validation'

describe('isValidClientCode', () => {
  it('accepts alphanumeric and hyphen codes', () => {
    expect(isValidClientCode('acme-co')).toBe(true)
    expect(isValidClientCode('ACME123')).toBe(true)
  })

  it('rejects spaces, underscores, and symbols', () => {
    expect(isValidClientCode('acme co')).toBe(false)
    expect(isValidClientCode('acme_co')).toBe(false)
    expect(isValidClientCode('')).toBe(false)
  })
})
