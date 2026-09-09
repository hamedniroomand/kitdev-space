import { describe, expect, it } from 'bun:test'
import { enforceRateLimit } from '#server/utils/network/rate-limit'

describe('enforceRateLimit', () => {
  it('allows requests under the limit', () => {
    const ip = '203.0.113.1'
    const key = 'headers'

    for (let i = 0; i < 20; i++) {
      enforceRateLimit(ip, key)
    }
  })

  it('throws 429 when the limit is exceeded', () => {
    const ip = '203.0.113.2'
    const key = 'headers'

    for (let i = 0; i < 20; i++) {
      enforceRateLimit(ip, key)
    }

    try {
      enforceRateLimit(ip, key)
      throw new Error('expected a 429 error')
    }
    catch (error) {
      expect(error).toMatchObject({ statusCode: 429 })
    }
  })

  it('tracks limits per IP and route', () => {
    const ip = '203.0.113.3'

    for (let i = 0; i < 20; i++) {
      enforceRateLimit(ip, 'dns')
    }

    expect(() => enforceRateLimit(ip, 'headers')).not.toThrow()
  })

  it('keeps the DNS and Email Health buckets apart', () => {
    const ip = '203.0.113.5'

    for (let i = 0; i < 20; i++) {
      enforceRateLimit(ip, 'network:dns')
    }

    expect(() => enforceRateLimit(ip, 'network:email-health')).not.toThrow()
  })

  it('accepts a custom max request count', () => {
    const ip = '203.0.113.4'
    const key = 'password'

    for (let i = 0; i < 5; i++) {
      enforceRateLimit(ip, key, 5)
    }

    try {
      enforceRateLimit(ip, key, 5)
      throw new Error('expected a 429 error')
    }
    catch (error) {
      expect(error).toMatchObject({ statusCode: 429 })
    }
  })
})
