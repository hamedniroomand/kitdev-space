/**
 * Compares two byte arrays in constant time.
 *
 * A plain loop that stops at the first difference leaks the position of that
 * difference through its run time. An attacker can use the run time to find a
 * valid signature one byte at a time. This function reads every byte, so the
 * run time does not depend on the content.
 *
 * The length is not a secret, so an early return on a length difference is safe.
 */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) {
    return false
  }

  let diff = 0
  for (let i = 0; i < a.byteLength; i += 1) {
    diff |= a[i]! ^ b[i]!
  }
  return diff === 0
}
