import { describe, expect, it } from 'vitest'
import { getTextStats } from '../../../shared/utils/data/stats'

describe('getTextStats', () => {
  it('counts characters, lines, and utf-8 bytes', () => {
    const stats = getTextStats('ab\nc')
    expect(stats.characters).toBe(4)
    expect(stats.lines).toBe(2)
    expect(stats.bytes).toBe(4)
  })
})
