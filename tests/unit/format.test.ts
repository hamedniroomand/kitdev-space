import { describe, expect, it } from 'vitest'
import { formatBytes } from '../../shared/utils/format'

describe('formatBytes', () => {
  it('formats bytes, kilobytes, and megabytes', () => {
    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(1048576)).toBe('1.00 MB')
    expect(formatBytes(5242880)).toBe('5.00 MB')
  })
})
