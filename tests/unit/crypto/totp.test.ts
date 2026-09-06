import { describe, expect, it } from 'vitest'
import {
  base32Decode,
  base32Encode,
  generateTotp,
  generateTotpSecret,
  parseTotpUri,
} from '#shared/utils/crypto/totp'

describe('base32 encode and decode', () => {
  it('encodes and decodes bytes correctly', () => {
    const input = new Uint8Array([72, 101, 108, 108, 111]) // 'Hello'
    const encoded = base32Encode(input)
    expect(encoded).toBe('JBSWY3DP')
    const decoded = base32Decode(encoded)
    expect(Array.from(decoded)).toEqual(Array.from(input))
  })
})

describe('parseTotpUri', () => {
  it('parses standard otpauth uri', () => {
    const uri = 'otpauth://totp/KitDev:admin@example.com?secret=JBSWY3DPEHPK3PXP&issuer=KitDev&period=30&digits=6'
    const res = parseTotpUri(uri)
    expect(res).toEqual({
      secret: 'JBSWY3DPEHPK3PXP',
      issuer: 'KitDev',
      label: 'KitDev:admin@example.com',
      period: 30,
      digits: 6,
      algorithm: 'SHA-1',
    })
  })

  it('returns null for non-totp uri', () => {
    expect(parseTotpUri('https://example.com')).toBeNull()
  })
})

describe('generateTotp', () => {
  it('generates predictable TOTP code for known timestamp', async () => {
    const secret = 'JBSWY3DPEHPK3PXP'
    const res = await generateTotp(secret, { time: 1700000000000 })
    expect(res.code).toBe('324550')
    expect(res.remainingSeconds).toBeGreaterThan(0)
    expect(res.remainingSeconds).toBeLessThanOrEqual(30)
  })

  it('generates random Base32 secret', () => {
    const sec = generateTotpSecret()
    expect(sec.length).toBeGreaterThan(16)
    expect(() => base32Decode(sec)).not.toThrow()
  })
})
