import { describe, it, expect } from 'vitest'
import {
  isValidEmail,
  isValidDateFormat,
  isValidWeeklyStartDay,
  isValidHourlyRate,
  isValidPassword,
  hashPassword,
  verifyPassword,
  MIN_PASSWORD_LENGTH,
} from '../src/lib/profile.ts'

describe('isValidEmail', () => {
  it('accepts well-formed emails', () => {
    expect(isValidEmail('jane@opexia.test')).toBe(true)
    expect(isValidEmail('jane.doe+tag@sub.example.co')).toBe(true)
  })

  it('rejects malformed emails', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('jane')).toBe(false)
    expect(isValidEmail('jane@nodomain')).toBe(false)
    expect(isValidEmail('jane @opexia.test')).toBe(false)
    expect(isValidEmail(`${'a'.repeat(250)}@opexia.test`)).toBe(false)
    expect(isValidEmail(123)).toBe(false)
  })
})

describe('isValidDateFormat', () => {
  it('accepts the supported formats', () => {
    for (const f of ['YYYY-MM-DD', 'DD-MM-YYYY', 'MM-DD-YYYY']) expect(isValidDateFormat(f)).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isValidDateFormat('YYYY/MM/DD')).toBe(false)
    expect(isValidDateFormat('')).toBe(false)
    expect(isValidDateFormat(null)).toBe(false)
  })
})

describe('isValidWeeklyStartDay', () => {
  it('accepts monday and sunday only', () => {
    expect(isValidWeeklyStartDay('monday')).toBe(true)
    expect(isValidWeeklyStartDay('sunday')).toBe(true)
    expect(isValidWeeklyStartDay('friday')).toBe(false)
    expect(isValidWeeklyStartDay('Monday')).toBe(false)
  })
})

describe('isValidHourlyRate', () => {
  it('accepts non-negative numbers and null', () => {
    expect(isValidHourlyRate(0)).toBe(true)
    expect(isValidHourlyRate(150.5)).toBe(true)
    expect(isValidHourlyRate(null)).toBe(true)
  })

  it('rejects negative, non-number, and NaN', () => {
    expect(isValidHourlyRate(-1)).toBe(false)
    expect(isValidHourlyRate('150')).toBe(false)
    expect(isValidHourlyRate(Number.NaN)).toBe(false)
  })
})

describe('isValidPassword', () => {
  it(`enforces a minimum of ${MIN_PASSWORD_LENGTH} characters`, () => {
    expect(isValidPassword('a'.repeat(MIN_PASSWORD_LENGTH))).toBe(true)
    expect(isValidPassword('a'.repeat(MIN_PASSWORD_LENGTH - 1))).toBe(false)
    expect(isValidPassword('')).toBe(false)
    expect(isValidPassword(12345678)).toBe(false)
  })
})

describe('password hashing', () => {
  it('hashes deterministically and verifies correctly', async () => {
    const h1 = await hashPassword('correct horse battery staple')
    const h2 = await hashPassword('correct horse battery staple')
    expect(h1).toBe(h2)
    expect(h1).toMatch(/^[0-9a-f]{64}$/)
    expect(await verifyPassword('correct horse battery staple', h1)).toBe(true)
    expect(await verifyPassword('wrong password', h1)).toBe(false)
    expect(await verifyPassword('correct horse battery staple', null)).toBe(false)
  })

  it('does not equal the plaintext', async () => {
    const h = await hashPassword('s3cret-pass')
    expect(h).not.toBe('s3cret-pass')
  })
})
