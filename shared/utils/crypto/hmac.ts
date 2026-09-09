import { base64ToBytes, bytesToBase64 } from './base64'
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

export async function generateHmac(
  message: string,
  key: Uint8Array,
  algorithm: HmacAlgorithm = 'SHA-256',
  encoding: HmacEncoding = 'hex',
): Promise<string> {
  const bytes = await hmacBytes(message, key, algorithm)
  return encoding === 'base64' ? bytesToBase64(bytes) : bytesToHex(bytes)
}

export function generateRandomSecret(length = 32): string {
  const bytes = new Uint8Array(length)
  globalThis.crypto.getRandomValues(bytes)
  return bytesToHex(bytes)
}
