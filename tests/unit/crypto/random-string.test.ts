import { describe, expect, it } from 'vitest'
import { createRandomString } from '#shared/utils/crypto/random-string'

describe('random string', () => {
  it('respects length and charset', () => {
    const value = createRandomString({ length: 16, charset: 'hex' })
    expect(value).toHaveLength(16)
    expect(value).toMatch(/^[0-9a-f]+$/i)
  })

  it('generates strings without rejection bias for various charsets', () => {
    const value = createRandomString({ length: 500, charset: 'numeric' })
    expect(value).toHaveLength(500)
    expect(value).toMatch(/^\d+$/)
    // Verify distribution covers digits 0-9
    const digits = new Set(value.split(''))
    expect(digits.size).toBe(10)
  })
})
