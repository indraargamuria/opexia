import { describe, it, expect } from 'vitest'
import { buildQueryString } from '@/lib/query'

describe('buildQueryString', () => {
  it('serializes present params', () => {
    expect(buildQueryString({ a: '1', b: 'two words' })).toBe('?a=1&b=two%20words')
  })

  it('skips empty and undefined values', () => {
    expect(buildQueryString({ a: '', b: undefined, c: 3 })).toBe('?c=3')
  })

  it('returns empty string for no params', () => {
    expect(buildQueryString({})).toBe('')
  })
})
