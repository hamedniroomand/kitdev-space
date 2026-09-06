import type { HashAlgorithm } from '#shared/utils/crypto/types'
import { isHashAlgorithm } from '#shared/utils/crypto/types'

export type { HashAlgorithm }

export function hashText(input: string, algorithm: HashAlgorithm): string {
  if (!isHashAlgorithm(algorithm)) {
    throw new Error('Choose a valid hash algorithm.')
  }

  if (algorithm === 'crc32') {
    return (Bun.hash.crc32(input) >>> 0).toString(16).padStart(8, '0')
  }

  if (algorithm === 'xxhash64') {
    return BigInt.asUintN(64, Bun.hash.xxHash64(input)).toString(16).padStart(16, '0')
  }

  if (algorithm === 'wyhash') {
    return BigInt.asUintN(64, Bun.hash.wyhash(input)).toString(16).padStart(16, '0')
  }

  const hasher = new Bun.CryptoHasher(algorithm)
  hasher.update(input)
  return hasher.digest('hex')
}
