import { describe, expect, it } from 'vitest'
import { diffTexts, formatUnifiedDiff } from '#shared/utils/data/diff'

describe('diffTexts', () => {
  it('returns empty result for empty equal texts', () => {
    expect(diffTexts('', '')).toEqual({
      lines: [],
      added: 0,
      removed: 0,
      unchanged: 0,
    })
  })

  it('marks identical multi-line text as equal', () => {
    const text = 'one\ntwo\nthree'
    const result = diffTexts(text, text)
    expect(result.added).toBe(0)
    expect(result.removed).toBe(0)
    expect(result.unchanged).toBe(3)
    expect(result.lines.every(line => line.type === 'equal')).toBe(true)
  })

  it('normalizes CRLF and LF line endings before diffing', () => {
    const result = diffTexts('a\r\nb', 'a\nb')
    expect(result.added).toBe(0)
    expect(result.removed).toBe(0)
    expect(result.unchanged).toBe(2)
  })

  it('detects inserts and deletes', () => {
    const result = diffTexts('a\nb\nc', 'a\nx\nc')
    expect(result.removed).toBe(1)
    expect(result.added).toBe(1)
    expect(result.unchanged).toBe(2)
    expect(result.lines.map(line => [line.type, line.text])).toEqual([
      ['equal', 'a'],
      ['delete', 'b'],
      ['insert', 'x'],
      ['equal', 'c'],
    ])
  })

  it('handles full replace', () => {
    const result = diffTexts('old', 'new')
    expect(result.lines).toEqual([
      { type: 'delete', text: 'old', oldLine: 1, newLine: null },
      { type: 'insert', text: 'new', oldLine: null, newLine: 1 },
    ])
  })

  it('keeps shared prefix and suffix as equal', () => {
    const left = Array.from({ length: 100 }, (_, i) => `line-${i}`).join('\n')
    const right = left.replace('line-50', 'changed-50')
    const result = diffTexts(left, right)
    expect(result.added).toBe(1)
    expect(result.removed).toBe(1)
    expect(result.unchanged).toBe(99)
  })

  it('compares long similar texts quickly', () => {
    const base = Array.from({ length: 5000 }, (_, i) => `row-${i}-payload`).join('\n')
    const changed = `${base}\nextra-line`
    const start = performance.now()
    const result = diffTexts(base, changed)
    const elapsed = performance.now() - start
    expect(result.added).toBe(1)
    expect(result.removed).toBe(0)
    expect(elapsed).toBeLessThan(200)
  })
})

describe('formatUnifiedDiff', () => {
  it('returns empty string when texts match', () => {
    const result = diffTexts('same', 'same')
    expect(formatUnifiedDiff(result)).toBe('')
  })

  it('builds a unified diff with headers', () => {
    const result = diffTexts('a\nb\nc', 'a\nx\nc')
    const unified = formatUnifiedDiff(result, 'old.txt', 'new.txt')
    expect(unified).toContain('--- old.txt')
    expect(unified).toContain('+++ new.txt')
    expect(unified).toContain('-b')
    expect(unified).toContain('+x')
  })
})
