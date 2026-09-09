import { describe, expect, it } from 'vitest'
import { timingSafeEqual } from '#shared/utils/crypto/constant-time'

describe('timingSafeEqual', () => {
  it('accepts equal byte arrays', () => {
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true)
    expect(timingSafeEqual(new Uint8Array(), new Uint8Array())).toBe(true)
  })

  it('rejects a difference in any position', () => {
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([9, 2, 3]))).toBe(false)
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 9]))).toBe(false)
  })

  it('rejects a length difference', () => {
    expect(timingSafeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]))).toBe(false)
  })

  it('reads every byte, so it makes no early return', () => {
    // A first-byte difference and a last-byte difference both read the full length.
    let reads = 0
    const counted = new Proxy(new Uint8Array([1, 2, 3, 4]), {
      get(target, key) {
        if (typeof key === 'string' && /^\d+$/.test(key)) {
          reads += 1
        }
        return Reflect.get(target, key)
      },
    })
    timingSafeEqual(counted, new Uint8Array([9, 9, 9, 9]))
    expect(reads).toBe(4)
  })
})
