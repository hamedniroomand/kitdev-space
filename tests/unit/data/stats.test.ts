import { describe, expect, it } from 'vitest'
import { getTextStats } from '#shared/utils/data/stats'

describe('getTextStats', () => {
  it('counts characters, words, lines, and utf-8 bytes', () => {
    const stats = getTextStats('Hello world.\nThis is a test.')
    expect(stats.characters).toBe(28)
    expect(stats.words).toBe(6)
    expect(stats.lines).toBe(2)
    expect(stats.sentences).toBe(2)
    expect(stats.paragraphs).toBe(1)
    expect(stats.bytes).toBe(28)
  })

  it('handles empty text correctly', () => {
    const stats = getTextStats('')
    expect(stats.characters).toBe(0)
    expect(stats.words).toBe(0)
    expect(stats.lines).toBe(0)
  })
})
