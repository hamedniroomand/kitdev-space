import { describe, expect, it } from 'vitest'
import { formatReadingTime, getTextStats } from '#shared/utils/data/stats'

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

  it('counts sentences correctly when trailing sentence lacks terminal punctuation', () => {
    const stats = getTextStats('Hello. World')
    expect(stats.sentences).toBe(2)
  })

  it('counts 0 paragraphs for whitespace-only strings', () => {
    const stats = getTextStats('   ')
    expect(stats.paragraphs).toBe(0)
  })

  it('counts a\\n as one line', () => {
    const stats = getTextStats('a\n')
    expect(stats.lines).toBe(1)
  })
})

describe('formatReadingTime', () => {
  it('writes a short label for one minute or less', () => {
    expect(formatReadingTime(0)).toBe('< 1 min read')
    expect(formatReadingTime(1)).toBe('< 1 min read')
  })

  it('writes the minute count for a longer text', () => {
    expect(formatReadingTime(3)).toBe('3 min read')
  })

  it('accepts another suffix', () => {
    expect(formatReadingTime(4, 'speaking')).toBe('4 min speaking')
  })
})

describe('getTextStats reading and speaking time', () => {
  it('reports a slower speaking time than reading time', () => {
    const stats = getTextStats(Array.from({ length: 450 }).fill('word').join(' '))
    expect(stats.words).toBe(450)
    expect(stats.readingTimeMinutes).toBe(3)
    expect(stats.speakingTimeMinutes).toBe(4)
  })
})

describe('getTextStats grapheme and code point counts', () => {
  it('counts ASCII characters identically for codePoints and graphemes', () => {
    const stats = getTextStats('hello')
    expect(stats.codePoints).toBe(5)
    expect(stats.graphemes).toBe(5)
  })

  it('counts a multi-code-point emoji family sequence as one grapheme', () => {
    // 👨‍👩‍👧 is one visible character but multiple code points
    const family = '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}'
    const stats = getTextStats(family)
    expect(stats.graphemes).toBe(1)
    expect(stats.codePoints).toBeGreaterThan(1)
    expect(stats.codePoints).toBeLessThan(stats.characters) // surrogates inflate .length
  })

  it('counts each combining character sequence as one grapheme', () => {
    // é composed via combining grave: e + combining accent
    const combining = 'e\u0301'
    const stats = getTextStats(combining)
    expect(stats.codePoints).toBe(2)
    expect(stats.graphemes).toBe(1)
  })

  it('counts ZWJ emoji flag sequence correctly', () => {
    // 🇺🇸 US flag (2 regional indicator letters = 1 grapheme)
    const flag = '\u{1F1FA}\u{1F1F8}'
    const stats = getTextStats(flag)
    expect(stats.graphemes).toBe(1)
    expect(stats.codePoints).toBe(2)
  })

  it('returns 0 for empty string', () => {
    const stats = getTextStats('')
    expect(stats.graphemes).toBe(0)
    expect(stats.codePoints).toBe(0)
  })
})
