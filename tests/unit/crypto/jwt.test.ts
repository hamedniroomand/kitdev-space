import { beforeAll, describe, expect, it } from 'vitest'
import { decodeJwt, verifyJwt } from '#shared/utils/crypto/jwt'

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

async function signHmac(secret: string, hash: string, input: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(input))
  return encodeBase64Url(new Uint8Array(signature))
}

async function hmacToken(secret: string, alg: string, hash: string): Promise<string> {
  const signingInput = `${encodeJson({ alg, typ: 'JWT' })}.${encodeJson({ sub: 'user-1' })}`
  return `${signingInput}.${await signHmac(secret, hash, signingInput)}`
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
    const signature = await signHmac(secret, 'SHA-256', signingInput)
    const token = `${signingInput}.${signature}`

    await expect(verifyJwt(token, secret)).resolves.toBe('valid')
    await expect(verifyJwt(token, 'wrong')).resolves.toBe('invalid')
    await expect(verifyJwt(token, '')).resolves.toBe('missing-key')
  })

  it('verifies HS384 and HS512 signatures', async () => {
    const secret = 'test-secret'
    const hs384 = await hmacToken(secret, 'HS384', 'SHA-384')
    const hs512 = await hmacToken(secret, 'HS512', 'SHA-512')

    await expect(verifyJwt(hs384, secret)).resolves.toBe('valid')
    await expect(verifyJwt(hs384, 'wrong')).resolves.toBe('invalid')
    await expect(verifyJwt(hs512, secret)).resolves.toBe('valid')
    await expect(verifyJwt(hs512, 'wrong')).resolves.toBe('invalid')
  })

  it('preserves leading and trailing whitespace in secrets without trimming', async () => {
    const secretWithSpaces = '  secret-with-spaces  '
    const header = encodeJson({ alg: 'HS256', typ: 'JWT' })
    const payload = encodeJson({ sub: 'user-2' })
    const signingInput = `${header}.${payload}`
    const signature = await signHmac(secretWithSpaces, 'SHA-256', signingInput)
    const token = `${signingInput}.${signature}`

    await expect(verifyJwt(token, secretWithSpaces)).resolves.toBe('valid')
    await expect(verifyJwt(token, secretWithSpaces.trim())).resolves.toBe('invalid')
  })

  it('rejects an unknown algorithm and never accepts alg none', async () => {
    const payload = encodeJson({ sub: 'user-1' })
    const es256 = `${encodeJson({ alg: 'ES256', typ: 'JWT' })}.${payload}.sig`
    const none = `${encodeJson({ alg: 'none', typ: 'JWT' })}.${payload}.`

    await expect(verifyJwt(es256, 'secret')).resolves.toBe('unsupported')
    await expect(verifyJwt(none, '')).resolves.toBe('invalid')
    await expect(verifyJwt(none, 'secret')).resolves.toBe('invalid')
  })
})

describe('jwt RS256', () => {
  let pem = ''
  let jwk = ''
  let token = ''

  beforeAll(async () => {
    const pair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify'],
    )

    const spki = new Uint8Array(await crypto.subtle.exportKey('spki', pair.publicKey))
    let base64 = ''
    for (const byte of spki) {
      base64 += String.fromCharCode(byte)
    }
    pem = `-----BEGIN PUBLIC KEY-----\n${btoa(base64).replace(/(.{64})/g, '$1\n')}\n-----END PUBLIC KEY-----`
    jwk = JSON.stringify(await crypto.subtle.exportKey('jwk', pair.publicKey))

    const signingInput = `${encodeJson({ alg: 'RS256', typ: 'JWT' })}.${encodeJson({ sub: 'user-1' })}`
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      pair.privateKey,
      new TextEncoder().encode(signingInput),
    )
    token = `${signingInput}.${encodeBase64Url(new Uint8Array(signature))}`
  })

  it('verifies a valid RS256 token with a PEM public key', async () => {
    await expect(verifyJwt(token, pem)).resolves.toBe('valid')
  })

  it('verifies a valid RS256 token with a JWK public key', async () => {
    await expect(verifyJwt(token, jwk)).resolves.toBe('valid')
  })

  it('rejects an RS256 token with a broken signature', async () => {
    const parts = token.split('.')
    const broken = `${parts[0]}.${parts[1]}.${parts[2]!.slice(0, -4)}AAAA`
    await expect(verifyJwt(broken, pem)).resolves.toBe('invalid')
  })

  it('reports a missing public key', async () => {
    await expect(verifyJwt(token, '')).resolves.toBe('missing-key')
  })
})
