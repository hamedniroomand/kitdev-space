import { describe, expect, it } from 'vitest'
import { createRandomString } from '../../../shared/utils/crypto/random-string'

describe('random string', () => {
  it('respects length and charset', () => {
    const value = createRandomString({ length: 16, charset: 'hex' })
    expect(value).toHaveLength(16)
    expect(value).toMatch(/^[0-9a-f]+$/i)
  })
})
