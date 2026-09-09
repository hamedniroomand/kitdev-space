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

export type JwtVerifyStatus = 'valid' | 'invalid' | 'unsupported' | 'missing-key'

/** The hash of each supported HMAC algorithm. The key is a shared secret. */
const HMAC_HASHES: Record<string, string> = {
  HS256: 'SHA-256',
  HS384: 'SHA-384',
  HS512: 'SHA-512',
}

/** The hash of each supported RSA algorithm. The key is a public key. */
const RSA_HASHES: Record<string, string> = {
  RS256: 'SHA-256',
  RS384: 'SHA-384',
  RS512: 'SHA-512',
}

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

export type JwtClaimMatch = 'match' | 'mismatch' | 'not-checked'

/**
 * Compares an expected value with a claim of the token.
 *
 * An empty expected value is not checked, so it never counts as a match.
 * The `aud` claim holds a string or an array of strings, and both work here.
 */
export function matchJwtClaim(expected: string, claim: unknown): JwtClaimMatch {
  const wanted = expected.trim()
  if (!wanted) {
    return 'not-checked'
  }
  if (typeof claim === 'string') {
    return claim === wanted ? 'match' : 'mismatch'
  }
  if (Array.isArray(claim)) {
    return claim.includes(wanted) ? 'match' : 'mismatch'
  }
  return 'mismatch'
}

async function hmacSign(secret: string, hash: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return new Uint8Array(signature)
}

/** Reads a public key in PEM (SPKI) or JWK form. It never fetches a remote key. */
async function importRsaPublicKey(key: string, hash: string): Promise<CryptoKey> {
  const algorithm = { name: 'RSASSA-PKCS1-v1_5', hash }
  const trimmed = key.trim()

  if (trimmed.startsWith('{')) {
    let jwk: JsonWebKey
    try {
      jwk = JSON.parse(trimmed) as JsonWebKey
    }
    catch (cause) {
      throw new Error('Invalid JWK.\n\nCheck the public key and try again.', { cause })
    }
    // `alg` and `key_ops` in the JWK must agree with the algorithm above, and a
    // copied key often disagrees. Drop them and use the token header instead.
    const { alg: _alg, key_ops: _keyOps, ext: _ext, use: _use, ...rest } = jwk
    return crypto.subtle.importKey('jwk', { ...rest, ext: true }, algorithm, false, ['verify'])
  }

  const body = trimmed.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  if (!body) {
    throw new Error('Invalid public key.\n\nPaste a PEM or a JWK public key.')
  }
  return crypto.subtle.importKey('spki', decodeBase64Url(body), algorithm, false, ['verify'])
}

/**
 * Verifies the signature of a token. The header `alg` selects the check.
 *
 * `key` is the shared secret for HS256, HS384, and HS512. It is a PEM or a JWK
 * public key for RS256, RS384, and RS512. An `alg` of `none` is never valid.
 */
export async function verifyJwt(token: string, key: string): Promise<JwtVerifyStatus> {
  const parts = token.trim().split('.')
  if (parts.length !== 3 || !parts[0] || !parts[1] || parts[2] == null) {
    throw new Error('A JWT must have three parts separated by dots.')
  }

  const { algorithm } = decodeJwt(token)
  if (algorithm == null || algorithm.toLowerCase() === 'none') {
    return 'invalid'
  }

  const hmacHash = HMAC_HASHES[algorithm]
  const rsaHash = RSA_HASHES[algorithm]
  if (!hmacHash && !rsaHash) {
    return 'unsupported'
  }
  if (!key) {
    return 'missing-key'
  }

  const signingInput = `${parts[0]}.${parts[1]}`
  const signature = decodeBase64Url(parts[2])

  if (hmacHash) {
    const expected = await hmacSign(key, hmacHash, signingInput)
    return timingSafeEqual(expected, signature) ? 'valid' : 'invalid'
  }

  const publicKey = await importRsaPublicKey(key, rsaHash!)
  const verified = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey,
    signature,
    new TextEncoder().encode(signingInput),
  )
  return verified ? 'valid' : 'invalid'
}
