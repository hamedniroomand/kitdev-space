import { describe, expect, it } from 'vitest'
import {
  explainRegex,
  normalizeRegexFlags,
  testRegex,
} from '#shared/utils/dev/regex'

describe('normalizeRegexFlags', () => {
  it('keeps unique supported flags', () => {
    expect(normalizeRegexFlags('gigiu')).toBe('giu')
  })
})

describe('explainRegex', () => {
  it('explains classes, quantifiers, and lookarounds', () => {
    const explanations = explainRegex('(?<=@)\\w+\\d*')
    expect(explanations.some(item => item.token === '(?<=' && item.meaning.includes('lookbehind'))).toBe(true)
    expect(explanations.some(item => item.token === '\\w')).toBe(true)
    expect(explanations.some(item => item.token === '+')).toBe(true)
  })
})

describe('testRegex', () => {
  it('highlights matches and named groups', () => {
    const result = testRegex('(?<word>[A-Z][a-z]+)', 'Hello world and Kit', 'g')
    expect(result.valid).toBe(true)
    expect(result.matches).toHaveLength(2)
    expect(result.matches[0]?.groups.some(group => group.name === 'word' && group.value === 'Hello')).toBe(true)
    expect(result.highlights.some(segment => segment.matched && segment.text === 'Hello')).toBe(true)
  })

  it('returns a clear error for invalid syntax', () => {
    const result = testRegex('(', 'abc', 'g')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Invalid regular expression')
  })
})
