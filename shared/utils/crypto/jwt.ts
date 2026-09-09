import { timingSafeEqual } from './constant-time'

export interface JwtClaims {
  exp?: number
  nbf?: number
  iat?: number
  [key: string]: unknown
}

export interface JwtDecodeResult {
  header: Record<string, unknown>
  payload: JwtClaims
  signature: string
  headerJson: string
  payloadJson: string
  expired: boolean | null
  notBeforeValid: boolean | null
  algorithm: string | null
}

export type JwtVerifyStatus = 'valid' | 'invalid' | 'unsupported' | 'missing-secret'

function padBase64(value: string): string {
  const rem = value.length % 4
  return rem === 0 ? value : value + '='.repeat(4 - rem)
}

export function decodeBase64Url(value: string): Uint8Array {
  const normalized = padBase64(value.replace(/-/g, '+').replace(/_/g, '/'))
  try {
    const binary = atob(normalized)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }
  catch (cause) {
    throw new Error('Invalid Base64URL in the JWT.\n\nCheck the token and try again.', { cause })
  }
}

function decodeJsonPart(part: string): Record<string, unknown> {
  const text = new TextDecoder().decode(decodeBase64Url(part))
  try {
    const value = JSON.parse(text) as unknown
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('JWT part must be a JSON object.')
    }
    return value as Record<string, unknown>
  }
  catch (cause) {
    throw new Error('Invalid JSON in the JWT.\n\nCheck the token and try again.', { cause })
  }
}

function readUnixClaim(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null
  }
  return value
}

export function decodeJwt(token: string, nowSec = Math.floor(Date.now() / 1000)): JwtDecodeResult {
  const parts = token.trim().split('.')
  if (parts.length !== 3 || !parts[0] || !parts[1]) {
    throw new Error('A JWT must have three parts separated by dots.')
  }

  const header = decodeJsonPart(parts[0])
  const payload = decodeJsonPart(parts[1]) as JwtClaims
  const signature = parts[2] ?? ''

  const exp = readUnixClaim(payload.exp)
  const nbf = readUnixClaim(payload.nbf)
  const algorithm = typeof header.alg === 'string' ? header.alg : null

  return {
    header,
    payload,
    signature,
    headerJson: JSON.stringify(header, null, 2),
    payloadJson: JSON.stringify(payload, null, 2),
    expired: exp == null ? null : nowSec >= exp,
    notBeforeValid: nbf == null ? null : nowSec >= nbf,
    algorithm,
  }
}

async function hmacSha256(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return new Uint8Array(signature)
}

export async function verifyJwtHs256(token: string, secret: string): Promise<JwtVerifyStatus> {
  if (!secret) {
    return 'missing-secret'
  }

  const parts = token.trim().split('.')
  if (parts.length !== 3 || !parts[0] || !parts[1] || parts[2] == null) {
    throw new Error('A JWT must have three parts separated by dots.')
  }

  const decoded = decodeJwt(token)
  if (decoded.algorithm !== 'HS256') {
    return 'unsupported'
  }

  const signingInput = `${parts[0]}.${parts[1]}`
  const expected = await hmacSha256(secret, signingInput)
  const actual = decodeBase64Url(parts[2])
  return timingSafeEqual(expected, actual) ? 'valid' : 'invalid'
}
