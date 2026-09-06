import type { HashAlgorithm } from './types'

/**
 * Hashing in the browser.
 *
 * Web Crypto covers the SHA family only. MD5, CRC32, xxHash64, and wyhash have
 * no browser API, so those stay on the server. `canHashInBrowser` says which
 * path a tool must take.
 */

const SUBTLE_NAMES: Partial<Record<HashAlgorithm, string>> = {
  sha1: 'SHA-1',
  sha256: 'SHA-256',
  sha384: 'SHA-384',
  sha512: 'SHA-512'
}

export function canHashInBrowser(algorithm: HashAlgorithm): boolean {
  return algorithm in SUBTLE_NAMES
}

export function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

/** Hashes bytes with Web Crypto. Throws when the browser has no such algorithm. */
export async function hashBytes(bytes: BufferSource, algorithm: HashAlgorithm): Promise<string> {
  const name = SUBTLE_NAMES[algorithm]

  if (!name) {
    throw new Error('This algorithm needs the server.')
  }

  return toHex(await crypto.subtle.digest(name, bytes))
}

export async function hashString(input: string, algorithm: HashAlgorithm): Promise<string> {
  return hashBytes(new TextEncoder().encode(input), algorithm)
}
