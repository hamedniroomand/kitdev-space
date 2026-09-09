import type { TotpAlgorithm } from '#shared/utils/crypto/totp'
import { describe, expect, it } from 'vitest'
import {
  base32Decode,
  base32Encode,
  buildTotpUri,
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

describe('buildTotpUri', () => {
  it('percent-encodes the issuer and the account', () => {
    const uri = buildTotpUri({
      secret: 'JBSWY3DPEHPK3PXP',
      issuer: 'Kit Dev',
      account: 'admin@example.com',
      digits: 8,
      period: 60,
      algorithm: 'SHA-256',
    })

    expect(uri).toBe(
      'otpauth://totp/Kit%20Dev:admin%40example.com'
      + '?secret=JBSWY3DPEHPK3PXP&issuer=Kit%20Dev&algorithm=SHA256&digits=8&period=60',
    )
  })

  it('round-trips through parseTotpUri', () => {
    const uri = buildTotpUri({ secret: 'JBSWY3DPEHPK3PXP', issuer: 'KitDev', account: 'admin@example.com' })

    expect(parseTotpUri(uri)).toEqual({
      secret: 'JBSWY3DPEHPK3PXP',
      issuer: 'KitDev',
      label: 'KitDev:admin@example.com',
      period: 30,
      digits: 6,
      algorithm: 'SHA-1',
    })
  })

  it('omits the issuer when none is given', () => {
    expect(buildTotpUri({ secret: 'JBSWY3DPEHPK3PXP', account: 'admin' })).toBe(
      'otpauth://totp/admin?secret=JBSWY3DPEHPK3PXP&algorithm=SHA1&digits=6&period=30',
    )
  })
})

describe('generateTotp', () => {
  it('gives the same code for a fixed time', async () => {
    const first = await generateTotp('JBSWY3DPEHPK3PXP', { time: 1700000000000 })
    const second = await generateTotp('JBSWY3DPEHPK3PXP', { time: 1700000000000 })
    expect(second).toEqual(first)
  })

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

/** RFC 6238 Appendix B seeds repeat "1234567890" up to the block size of the hash. */
function rfcSeed(byteLength: number): string {
  const ascii = '1234567890'.repeat(Math.ceil(byteLength / 10)).slice(0, byteLength)
  return base32Encode(new TextEncoder().encode(ascii))
}

describe('generateTotp against RFC 6238 test vectors', () => {
  const seeds: Record<TotpAlgorithm, string> = {
    'SHA-1': rfcSeed(20),
    'SHA-256': rfcSeed(32),
    'SHA-512': rfcSeed(64),
  }

  const vectors: Array<{ seconds: number, codes: Record<TotpAlgorithm, string> }> = [
    { seconds: 59, codes: { 'SHA-1': '94287082', 'SHA-256': '46119246', 'SHA-512': '90693936' } },
    { seconds: 1111111109, codes: { 'SHA-1': '07081804', 'SHA-256': '68084774', 'SHA-512': '25091201' } },
    { seconds: 1234567890, codes: { 'SHA-1': '89005924', 'SHA-256': '91819424', 'SHA-512': '93441116' } },
    { seconds: 2000000000, codes: { 'SHA-1': '69279037', 'SHA-256': '90698825', 'SHA-512': '38618901' } },
    { seconds: 20000000000, codes: { 'SHA-1': '65353130', 'SHA-256': '77737706', 'SHA-512': '47863826' } },
  ]

  for (const algorithm of ['SHA-1', 'SHA-256', 'SHA-512'] as TotpAlgorithm[]) {
    it(`matches every ${algorithm} vector`, async () => {
      for (const vector of vectors) {
        const res = await generateTotp(seeds[algorithm], {
          time: vector.seconds * 1000,
          digits: 8,
          period: 30,
          algorithm,
        })
        expect(res.code, `${algorithm} at T=${vector.seconds}`).toBe(vector.codes[algorithm])
      }
    })
  }
})
