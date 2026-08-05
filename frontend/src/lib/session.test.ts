import { describe, it, expect } from 'vitest'
import { getSession, DEMO_USER_ID, DEMO_ROLE } from '@/lib/session'

describe('session', () => {
  it('returns the stub session identity', () => {
    expect(getSession()).toEqual({ id: DEMO_USER_ID, role: DEMO_ROLE })
  })
})
