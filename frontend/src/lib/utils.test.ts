import { describe, it, expect } from 'vitest'
import { cn, formatDuration, formatMinutes } from './utils'

describe('cn', () => {
  it('merges class names and resolves tailwind conflicts', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('a', 'b')).toBe('a b')
    expect(cn('', null, undefined, 'c')).toBe('c')
  })
})

describe('formatDuration', () => {
  it('formats seconds as HH:MM:SS', () => {
    expect(formatDuration(0)).toBe('00:00:00')
    expect(formatDuration(59)).toBe('00:00:59')
    expect(formatDuration(3600)).toBe('01:00:00')
    expect(formatDuration(45296)).toBe('12:34:56')
  })

  it('pads single digit values', () => {
    expect(formatDuration(3661)).toBe('01:01:01')
  })
})

describe('formatMinutes', () => {
  it('renders minutes only when under an hour', () => {
    expect(formatMinutes(0)).toBe('0m')
    expect(formatMinutes(45)).toBe('45m')
  })

  it('renders hours and minutes', () => {
    expect(formatMinutes(60)).toBe('1h')
    expect(formatMinutes(90)).toBe('1h 30m')
    expect(formatMinutes(125)).toBe('2h 5m')
  })
})
