import { timingSafeEqual } from './constant-time'

/**
 * Reads a digest that a user pasted, and compares it with the digest of the tool.
 *
 * A publisher writes a checksum in hex, in lower case or in upper case. Some
 * tools and some package files write it in Base64, with or without the padding
 * characters. `parseDigest` accepts each of those forms and gives the bytes.
 *
 * A short value, such as `abcdef`, is valid hex and valid Base64 at the same
 * time. Hex wins, because a checksum is hex in almost every file.
 */

const HEX_PATTERN = /^[0-9a-f]+$/i
const BASE64_PATTERN = /^[\w+/-]+={0,2}$/

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  }
  return bytes
}

function base64ToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

/** Gives the bytes of a hex or Base64 digest. Throws when the format is not valid. */
export function parseDigest(value: string): Uint8Array {
  const cleaned = value.trim().replace(/\s+/g, '')

  if (!cleaned) {
    throw new Error('Enter a hash to compare.')
  }

  if (HEX_PATTERN.test(cleaned) && cleaned.length % 2 === 0) {
    return hexToBytes(cleaned)
  }

  if (BASE64_PATTERN.test(cleaned)) {
    try {
      return base64ToBytes(cleaned)
    }
    catch (cause) {
      throw new Error('The hash is not valid hex and not valid Base64.', { cause })
    }
  }

  throw new Error('The hash is not valid hex and not valid Base64.')
}

/**
 * Compares two digests in constant time.
 *
 * The parse step is not constant time, and it does not need to be: it reads the
 * value that the user pasted, which is not a secret. The byte compare is
 * constant time, so the tool leaks no information about the digest of the input.
 */
export function digestsMatch(expected: string, actual: string): boolean {
  return timingSafeEqual(parseDigest(expected), parseDigest(actual))
}

/**
 * Formats one line of a checksum file, in the format of `sha256sum`.
 *
 * The line is the digest, two spaces, then the name of the file. Two spaces
 * mean text mode. `sha256sum -c` reads this format. A name of `-` means that
 * the input came from standard input, which is the same as text in this tool.
 */
export function checksumFileLine(digest: string, filename = '-'): string {
  return `${digest}  ${filename}\n`
}
