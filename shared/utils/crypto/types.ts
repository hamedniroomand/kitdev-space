export type HashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha384' | 'sha512'

export const HASH_ALGORITHMS: HashAlgorithm[] = ['md5', 'sha1', 'sha256', 'sha384', 'sha512']

export function isHashAlgorithm(value: string): value is HashAlgorithm {
  return HASH_ALGORITHMS.includes(value as HashAlgorithm)
}
