import { describe, expect, it } from 'vitest'
import { canHashInBrowser, hashString, toHex } from '#shared/utils/crypto/hash'

describe('canHashInBrowser', () => {
  it('covers the SHA family only', () => {
    expect(canHashInBrowser('sha1')).toBe(true)
    expect(canHashInBrowser('sha256')).toBe(true)
    expect(canHashInBrowser('sha384')).toBe(true)
    expect(canHashInBrowser('sha512')).toBe(true)
  })

  it('rejects the algorithms that Web Crypto does not have', () => {
    expect(canHashInBrowser('md5')).toBe(false)
    expect(canHashInBrowser('crc32')).toBe(false)
    expect(canHashInBrowser('xxhash64')).toBe(false)
    expect(canHashInBrowser('wyhash')).toBe(false)
  })
})

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

  it('reports an algorithm that the browser cannot run', async () => {
    await expect(hashString('hello', 'md5')).rejects.toThrow(/needs the server/)
  })
})

describe('toHex', () => {
  it('pads each byte to two characters', () => {
    expect(toHex(new Uint8Array([0, 15, 255]).buffer)).toBe('000fff')
  })
})
