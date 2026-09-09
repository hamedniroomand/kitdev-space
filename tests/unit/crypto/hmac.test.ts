import { describe, expect, it } from 'vitest'
import { bytesToBase64 } from '#shared/utils/crypto/base64'
import { hexToBytes } from '#shared/utils/crypto/hex'
import {
  decodeHmacKey,
  generateHmac,
  generateRandomSecret,
  verifyHmacSignature,
} from '#shared/utils/crypto/hmac'

// RFC 2202, HMAC-SHA-1 test case 1: key 0x0b repeated 20 times, data "Hi There".
const RFC2202_CASE1_KEY_HEX = '0b'.repeat(20)
const RFC2202_CASE1_DIGEST = 'b617318655057264e28bc0b6fb378c8ef146be00'
// RFC 2202, HMAC-SHA-1 test case 2: key "Jefe".
const RFC2202_CASE2_DIGEST = 'effcdf6ae5eb2fa2d27416d5f184df9c259a7c79'

describe('generateHmac', () => {
  it('generates SHA-256 HMAC in hex correctly', async () => {
    const res = await generateHmac('hello', decodeHmacKey('secret', 'text'), 'SHA-256', 'hex')
    expect(res).toBe('88aab3ede8d3adf94d26ab90d3bafd4a2083070c3bcce9c014ee04a443847c0b')
  })

  it('generates SHA-256 HMAC in base64 correctly', async () => {
    const res = await generateHmac('hello', decodeHmacKey('secret', 'text'), 'SHA-256', 'base64')
    expect(res).toBe('iKqz7ejTrflNJquQ07r9SiCDBww7zOnAFO4EpEOEfAs=')
  })

  it('supports SHA-512', async () => {
    const res = await generateHmac('hello', decodeHmacKey('secret', 'text'), 'SHA-512', 'hex')
    expect(res).toHaveLength(128)
  })

  it('rejects an empty key', async () => {
    await expect(generateHmac('hello', new Uint8Array(0))).rejects.toThrow(/secret key is empty/i)
  })

  it('generates random secret of expected length', () => {
    const secret = generateRandomSecret(16)
    expect(secret).toHaveLength(32) // 16 bytes = 32 hex chars
  })
})

describe('decodeHmacKey', () => {
  it('reads a text key as UTF-8', () => {
    expect(Array.from(decodeHmacKey('Jefe', 'text'))).toEqual([0x4A, 0x65, 0x66, 0x65])
  })

  it('reads a hex key and a base64 key as the same bytes', () => {
    expect(decodeHmacKey('4a656665', 'hex')).toEqual(decodeHmacKey('Jefe', 'text'))
    expect(decodeHmacKey('SmVmZQ==', 'base64')).toEqual(decodeHmacKey('Jefe', 'text'))
  })

  it('reports an error for invalid hex', () => {
    expect(() => decodeHmacKey('zz', 'hex')).toThrow(/invalid hex/i)
    expect(() => decodeHmacKey('abc', 'hex')).toThrow(/invalid hex/i)
  })

  it('reports an error for invalid base64', () => {
    expect(() => decodeHmacKey('!!!!', 'base64')).toThrow(/invalid base64/i)
  })
})

describe('hmac key encodings against RFC 2202', () => {
  it('matches SHA-1 case 1 with a hex key', async () => {
    const res = await generateHmac('Hi There', decodeHmacKey(RFC2202_CASE1_KEY_HEX, 'hex'), 'SHA-1', 'hex')
    expect(res).toBe(RFC2202_CASE1_DIGEST)
  })

  it('matches SHA-1 case 1 with the same key in base64', async () => {
    const base64Key = bytesToBase64(hexToBytes(RFC2202_CASE1_KEY_HEX))
    const res = await generateHmac('Hi There', decodeHmacKey(base64Key, 'base64'), 'SHA-1', 'hex')
    expect(res).toBe(RFC2202_CASE1_DIGEST)
  })

  it('matches SHA-1 case 2 with a text key', async () => {
    const res = await generateHmac(
      'what do ya want for nothing?',
      decodeHmacKey('Jefe', 'text'),
      'SHA-1',
      'hex',
    )
    expect(res).toBe(RFC2202_CASE2_DIGEST)
  })
})

describe('verifyHmacSignature', () => {
  const actual = hexToBytes(RFC2202_CASE1_DIGEST)

  it('does not check an empty expected value', () => {
    expect(verifyHmacSignature('', actual)).toBe('not-checked')
    expect(verifyHmacSignature('  ', actual)).toBe('not-checked')
    expect(verifyHmacSignature('sha256=', actual)).toBe('not-checked')
  })

  it('reports a match for an equal hex signature', () => {
    expect(verifyHmacSignature(RFC2202_CASE1_DIGEST, actual)).toBe('match')
  })

  it('reports a match for upper case hex', () => {
    expect(verifyHmacSignature(RFC2202_CASE1_DIGEST.toUpperCase(), actual)).toBe('match')
  })

  it('strips an algorithm prefix', () => {
    expect(verifyHmacSignature(`sha256=${RFC2202_CASE1_DIGEST}`, actual)).toBe('match')
    expect(verifyHmacSignature(`SHA1=${RFC2202_CASE1_DIGEST}`, actual)).toBe('match')
  })

  it('reports a match for an equal Base64 signature', () => {
    expect(verifyHmacSignature(bytesToBase64(actual), actual)).toBe('match')
  })

  it('reports a mismatch for an unequal signature', () => {
    const other = `${RFC2202_CASE1_DIGEST.slice(0, -2)}ff`
    expect(verifyHmacSignature(other, actual)).toBe('mismatch')
  })

  it('reports a mismatch for a length mismatch', () => {
    expect(verifyHmacSignature(RFC2202_CASE1_DIGEST.slice(0, 8), actual)).toBe('mismatch')
    expect(verifyHmacSignature(`${RFC2202_CASE1_DIGEST}0000`, actual)).toBe('mismatch')
  })

  it('throws for an expected value that is neither hex nor Base64', () => {
    expect(() => verifyHmacSignature('not a signature!', actual)).toThrow(/invalid base64/i)
  })
})
