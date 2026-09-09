import { describe, expect, it } from 'vitest'
import { checksumFileLine, digestsMatch, parseDigest } from '#shared/utils/crypto/digest'

const HELLO_SHA256_HEX = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
const HELLO_SHA256_BASE64 = 'LPJNul+wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ='

describe('parseDigest', () => {
  it('reads lower case and upper case hex', () => {
    expect(parseDigest('000fff')).toEqual(new Uint8Array([0, 15, 255]))
    expect(parseDigest('000FFF')).toEqual(new Uint8Array([0, 15, 255]))
  })

  it('removes the spaces of a pasted value', () => {
    expect(parseDigest('  00 0f ff  ')).toEqual(new Uint8Array([0, 15, 255]))
  })

  it('reads Base64, with padding and without padding', () => {
    expect(parseDigest('AA//')).toEqual(new Uint8Array([0, 15, 255]))
    expect(parseDigest('/w==')).toEqual(new Uint8Array([255]))
    expect(parseDigest('/w')).toEqual(new Uint8Array([255]))
  })

  it('reads the URL-safe Base64 alphabet', () => {
    expect(parseDigest('AA__')).toEqual(new Uint8Array([0, 15, 255]))
  })

  it('reports an empty value and an invalid format', () => {
    expect(() => parseDigest('   ')).toThrow(/Enter a hash/)
    expect(() => parseDigest('zz!!')).toThrow(/not valid hex/)
    // Odd length is not hex, and `!` is not in the Base64 alphabet.
    expect(() => parseDigest('abc!')).toThrow(/not valid hex/)
  })
})

describe('digestsMatch', () => {
  it('matches the same digest in different formats and cases', () => {
    expect(digestsMatch(HELLO_SHA256_HEX, HELLO_SHA256_HEX)).toBe(true)
    expect(digestsMatch(HELLO_SHA256_HEX.toUpperCase(), HELLO_SHA256_HEX)).toBe(true)
    expect(digestsMatch(HELLO_SHA256_BASE64, HELLO_SHA256_HEX)).toBe(true)
  })

  it('rejects a different digest', () => {
    const other = HELLO_SHA256_HEX.replace(/4$/, '5')
    expect(digestsMatch(other, HELLO_SHA256_HEX)).toBe(false)
  })

  it('rejects a digest of another length', () => {
    expect(digestsMatch('2cf24dba', HELLO_SHA256_HEX)).toBe(false)
  })
})

describe('checksumFileLine', () => {
  it('writes the digest, two spaces, and the file name', () => {
    expect(checksumFileLine(HELLO_SHA256_HEX, 'archive.zip'))
      .toBe(`${HELLO_SHA256_HEX}  archive.zip\n`)
  })

  it('uses the standard input name when no file name is given', () => {
    expect(checksumFileLine('abcd')).toBe('abcd  -\n')
  })
})
