import type { IHasher } from 'hash-wasm'
import type { HashAlgorithm } from './types'
import {
  createCRC32,
  createMD5,
  createSHA1,
  createSHA256,
  createSHA384,
  createSHA512,
  createXXHash64,
} from 'hash-wasm'

/**
 * Hashing in the browser.
 *
 * Web Crypto covers the SHA family, but `crypto.subtle.digest` needs the full
 * input in memory. `hash-wasm` adds MD5, CRC32, and xxHash64, and it gives an
 * incremental hasher for every algorithm. A file streams through that hasher,
 * so a 2 GB file never sits in memory. Text keeps the Web Crypto path for the
 * SHA family, which loads no WebAssembly module.
 */

const SUBTLE_NAMES: Partial<Record<HashAlgorithm, string>> = {
  sha1: 'SHA-1',
  sha256: 'SHA-256',
  sha384: 'SHA-384',
  sha512: 'SHA-512',
}

const HASHERS: Record<HashAlgorithm, () => Promise<IHasher>> = {
  md5: createMD5,
  sha1: createSHA1,
  sha256: createSHA256,
  sha384: createSHA384,
  sha512: createSHA512,
  xxhash64: createXXHash64,
  crc32: createCRC32,
}

/** Reads the file in 8 MB pieces, so memory use does not follow the file size. */
const CHUNK_BYTES = 8 * 1024 * 1024

export function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function hashBytes(bytes: BufferSource, algorithm: HashAlgorithm): Promise<string> {
  const name = SUBTLE_NAMES[algorithm]

  if (name) {
    return toHex(await crypto.subtle.digest(name, bytes))
  }

  const hasher = await HASHERS[algorithm]()
  hasher.init()
  hasher.update(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes as ArrayBuffer))
  return hasher.digest()
}

export async function hashString(input: string, algorithm: HashAlgorithm): Promise<string> {
  return hashBytes(new TextEncoder().encode(input), algorithm)
}

/**
 * Hashes a file as a stream of pieces.
 *
 * `onProgress` gets the count of bytes that the tool has read. A stream reader
 * gives a piece of the file at a time, so the tool holds one piece and the
 * hasher state, and never the full file.
 */
export async function hashFile(
  file: Blob,
  algorithm: HashAlgorithm,
  onProgress?: (bytesRead: number) => void,
): Promise<string> {
  const hasher = await HASHERS[algorithm]()
  hasher.init()

  const reader = file.stream().getReader()
  let bytesRead = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      for (let start = 0; start < value.byteLength; start += CHUNK_BYTES) {
        hasher.update(value.subarray(start, start + CHUNK_BYTES))
      }
      bytesRead += value.byteLength
      onProgress?.(bytesRead)
    }
  }
  finally {
    reader.releaseLock()
  }

  return hasher.digest()
}
