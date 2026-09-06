import { describe, expect, it } from 'vitest'
import { generateHmac, generateRandomSecret } from '#shared/utils/crypto/hmac'

describe('generateHmac', () => {
  it('generates SHA-256 HMAC in hex correctly', async () => {
    const res = await generateHmac('hello', 'secret', 'SHA-256', 'hex')
    expect(res).toBe('88aab3ede8d3adf94d26ab90d3bafd4a2083070c3bcce9c014ee04a443847c0b')
  })

  it('generates SHA-256 HMAC in base64 correctly', async () => {
    const res = await generateHmac('hello', 'secret', 'SHA-256', 'base64')
    expect(res).toBe('iKqz7ejTrflNJquQ07r9SiCDBww7zOnAFO4EpEOEfAs=')
  })

  it('supports SHA-512', async () => {
    const res = await generateHmac('hello', 'secret', 'SHA-512', 'hex')
    expect(res).toHaveLength(128)
  })

  it('generates random secret of expected length', () => {
    const secret = generateRandomSecret(16)
    expect(secret).toHaveLength(32) // 16 bytes = 32 hex chars
  })
})
