import { describe, expect, it } from 'vitest'
import { decodeBase64, encodeBase64 } from '../../../shared/utils/crypto/base64'

describe('base64', () => {
  it('round-trips text', () => {
    expect(decodeBase64(encodeBase64('KitDev'))).toBe('KitDev')
  })
})
