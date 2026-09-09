import { describe, expect, it } from 'vitest'
import { hashFile, hashString, toHex } from '#shared/utils/crypto/hash'

describe('hashString', () => {
  it('matches the known digest of "hello"', async () => {
    expect(await hashString('hello', 'sha256'))
      .toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
    expect(await hashString('hello', 'sha1'))
      .toBe('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d')
  })

  it('matches the known digest of an empty string', async () => {
    expect(await hashString('', 'sha256'))
      .toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })

  it('hashes UTF-8 text as bytes', async () => {
    expect(await hashString('héllo', 'sha256')).toHaveLength(64)
  })

  it('hashes the algorithms that Web Crypto does not have', async () => {
    expect(await hashString('hello', 'md5')).toBe('5d41402abc4b2a76b9719d911017c592')
    expect(await hashString('hello', 'crc32')).toBe('3610a686')
    expect(await hashString('hello', 'xxhash64')).toBe('26c7827d889f6da3')
  })
})

describe('hashFile', () => {
  it('gives the same digest as the text path', async () => {
    const file = new Blob(['hello'])
    expect(await hashFile(file, 'sha256')).toBe(await hashString('hello', 'sha256'))
    expect(await hashFile(file, 'md5')).toBe('5d41402abc4b2a76b9719d911017c592')
  })

  it('hashes a file that arrives in more than one piece', async () => {
    // A stream of three pieces must give the digest of the joined text.
    const parts = new Blob(['abc', 'def', 'ghi'])
    expect(await hashFile(parts, 'sha256')).toBe(await hashString('abcdefghi', 'sha256'))
  })

  it('reports the count of bytes that it read', async () => {
    const reads: number[] = []
    await hashFile(new Blob(['0123456789']), 'crc32', read => reads.push(read))
    expect(reads.at(-1)).toBe(10)
  })
})

describe('toHex', () => {
  it('pads each byte to two characters', () => {
    expect(toHex(new Uint8Array([0, 15, 255]).buffer)).toBe('000fff')
  })
})
