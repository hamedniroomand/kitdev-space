import { describe, expect, it } from 'vitest'
import { decodeHex, encodeHex } from '#shared/utils/crypto/hex'

describe('hex', () => {
  it('round-trips text', () => {
    expect(decodeHex(encodeHex('ab'))).toBe('ab')
  })
})
