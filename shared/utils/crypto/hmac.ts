import { base64ToBytes, bytesToBase64 } from './base64'
import { timingSafeEqual } from './constant-time'
import { bytesToHex, hexToBytes } from './hex'

export type HmacAlgorithm = 'SHA-256' | 'SHA-384' | 'SHA-512' | 'SHA-1'
export type HmacEncoding = 'hex' | 'base64'
/** How the user wrote the secret key. `text` reads the key as UTF-8. */
export type HmacKeyFormat = 'text' | 'hex' | 'base64'

/** Reads the key bytes out of the key text. It throws on an invalid format. */
export function decodeHmacKey(key: string, format: HmacKeyFormat): Uint8Array {
  if (format === 'hex') {
    return hexToBytes(key)
  }
  if (format === 'base64') {
    return base64ToBytes(key)
  }
  return new TextEncoder().encode(key)
}

export async function hmacBytes(
  message: string,
  key: Uint8Array,
  algorithm: HmacAlgorithm = 'SHA-256',
): Promise<Uint8Array> {
  const cryptoObj = globalThis.crypto
  if (!cryptoObj?.subtle) {
    throw new Error('Web Crypto API is not available in this environment.')
  }
  if (key.byteLength === 0) {
    throw new Error('The secret key is empty.\n\nEnter a secret key.')
  }

  const cryptoKey = await cryptoObj.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: { name: algorithm } },
    false,
    ['sign'],
  )

  const signature = await cryptoObj.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(message),
  )
  return new Uint8Array(signature)
}

export function encodeHmac(bytes: Uint8Array, encoding: HmacEncoding = 'hex'): string {
  return encoding === 'base64' ? bytesToBase64(bytes) : bytesToHex(bytes)
}

export async function generateHmac(
  message: string,
  key: Uint8Array,
  algorithm: HmacAlgorithm = 'SHA-256',
  encoding: HmacEncoding = 'hex',
): Promise<string> {
  return encodeHmac(await hmacBytes(message, key, algorithm), encoding)
}

export type HmacSignatureMatch = 'match' | 'mismatch' | 'not-checked'

/** Removes an optional algorithm prefix, such as `sha256=`, and all whitespace. */
function normalizeSignature(value: string): string {
  return value.trim().replace(/^sha(?:1|256|384|512)=/i, '').replace(/\s+/g, '')
}

/** Reads the expected signature bytes. It accepts hex or Base64, in any case. */
export function parseHmacSignature(value: string): Uint8Array {
  const cleaned = normalizeSignature(value)
  if (/^[0-9a-f]+$/i.test(cleaned) && cleaned.length % 2 === 0) {
    return hexToBytes(cleaned)
  }
  return base64ToBytes(cleaned)
}

/**
 * Compares an expected signature with the computed signature.
 *
 * The parse of the expected text runs first and is not constant time. Only the
 * byte compare must be constant time, and `timingSafeEqual` does that compare.
 * An empty expected value is not checked.
 */
export function verifyHmacSignature(expected: string, actual: Uint8Array): HmacSignatureMatch {
  if (!normalizeSignature(expected)) {
    return 'not-checked'
  }
  return timingSafeEqual(parseHmacSignature(expected), actual) ? 'match' : 'mismatch'
}

export function generateRandomSecret(length = 32): string {
  const bytes = new Uint8Array(length)
  globalThis.crypto.getRandomValues(bytes)
  return bytesToHex(bytes)
}
