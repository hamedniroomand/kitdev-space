import { isHashAlgorithm, type HashAlgorithm } from '../../../shared/utils/crypto/types'

export type { HashAlgorithm }

export function hashText(input: string, algorithm: HashAlgorithm): string {
  if (!isHashAlgorithm(algorithm)) {
    throw new Error('Choose a valid hash algorithm.')
  }

  const hasher = new Bun.CryptoHasher(algorithm)
  hasher.update(input)
  return hasher.digest('hex')
}
