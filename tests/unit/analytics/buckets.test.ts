import { describe, expect, it } from 'vitest'
import { inputBytesBucket, queryLengthBucket, textBytes } from '#shared/utils/analytics/buckets'

describe('inputBytesBucket', () => {
  it('maps sizes to ranges', () => {
    expect(inputBytesBucket(0)).toBe('0-1k')
    expect(inputBytesBucket(999)).toBe('0-1k')
    expect(inputBytesBucket(1_000)).toBe('1k-10k')
    expect(inputBytesBucket(9_999)).toBe('1k-10k')
    expect(inputBytesBucket(10_000)).toBe('10k-100k')
    expect(inputBytesBucket(100_000)).toBe('100k-1m')
    expect(inputBytesBucket(1_000_000)).toBe('1m+')
  })
})

describe('queryLengthBucket', () => {
  it('maps lengths to ranges', () => {
    expect(queryLengthBucket(0)).toBe('0')
    expect(queryLengthBucket(3)).toBe('1-3')
    expect(queryLengthBucket(4)).toBe('4-10')
    expect(queryLengthBucket(10)).toBe('4-10')
    expect(queryLengthBucket(11)).toBe('11+')
  })
})

describe('textBytes', () => {
  it('counts UTF-8 bytes, not characters', () => {
    expect(textBytes('abc')).toBe(3)
    expect(textBytes('é')).toBe(2)
    expect(textBytes('')).toBe(0)
  })
})
