import { describe, expect, it } from 'vitest'
import { decodeJwt, verifyJwtHs256 } from '#shared/utils/crypto/jwt'

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function encodeJson(value: unknown): string {
  return encodeBase64Url(new TextEncoder().encode(JSON.stringify(value)))
}

async function signHs256(secret: string, input: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(input))
  return encodeBase64Url(new Uint8Array(signature))
}

describe('jwt', () => {
  it('decodes header and payload and flags expiration', async () => {
    const header = encodeJson({ alg: 'HS256', typ: 'JWT' })
    const payload = encodeJson({ sub: 'user-1', exp: 1_700_000_000 })
    const token = `${header}.${payload}.sig`

    const decoded = decodeJwt(token, 1_700_000_001)
    expect(decoded.header.alg).toBe('HS256')
    expect(decoded.payload.sub).toBe('user-1')
    expect(decoded.expired).toBe(true)
    expect(decoded.headerJson).toContain('"alg": "HS256"')
  })

  it('verifies HS256 signatures', async () => {
    const secret = 'test-secret'
    const header = encodeJson({ alg: 'HS256', typ: 'JWT' })
    const payload = encodeJson({ sub: 'user-1', exp: 4_000_000_000 })
    const signingInput = `${header}.${payload}`
    const signature = await signHs256(secret, signingInput)
    const token = `${signingInput}.${signature}`

    await expect(verifyJwtHs256(token, secret)).resolves.toBe('valid')
    await expect(verifyJwtHs256(token, 'wrong')).resolves.toBe('invalid')
    await expect(verifyJwtHs256(token, '')).resolves.toBe('missing-secret')
  })

  it('rejects non-HS256 algorithms for verify', async () => {
    const header = encodeJson({ alg: 'RS256', typ: 'JWT' })
    const payload = encodeJson({ sub: 'user-1' })
    const token = `${header}.${payload}.sig`
    await expect(verifyJwtHs256(token, 'secret')).resolves.toBe('unsupported')
  })
})
