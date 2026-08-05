import { describe, it, expect } from 'vitest'
import { checksum } from '../src/lib/crypto'

describe('checksum', () => {
  it('returns a 64-char lowercase sha-256 hex digest', async () => {
    const digest = await checksum('hello')
    expect(digest).toMatch(/^[0-9a-f]{64}$/)
    expect(digest).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
  })

  it('is deterministic for identical input', async () => {
    expect(await checksum('opexia-test')).toBe(await checksum('opexia-test'))
  })

  it('changes when the input changes', async () => {
    expect(await checksum('entry-a')).not.toBe(await checksum('entry-b'))
  })
})
