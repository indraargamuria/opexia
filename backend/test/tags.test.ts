import { describe, it, expect } from 'vitest'
import { isValidHexColor } from '../src/lib/tags.ts'

describe('isValidHexColor', () => {
  it('accepts 6-digit hex codes', () => {
    expect(isValidHexColor('#6366f1')).toBe(true)
    expect(isValidHexColor('#ffffff')).toBe(true)
    expect(isValidHexColor('#ABCDEF')).toBe(true)
  })

  it('rejects malformed colors', () => {
    expect(isValidHexColor('red')).toBe(false)
    expect(isValidHexColor('#123')).toBe(false)
    expect(isValidHexColor('#12345g')).toBe(false)
    expect(isValidHexColor(42)).toBe(false)
    expect(isValidHexColor(null)).toBe(false)
  })
})
