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
      {
        type: 'delete',
        text: 'old',
        oldLine: 1,
        newLine: null,
        spans: [{ type: 'delete', text: 'old' }],
      },
      {
        type: 'insert',
        text: 'new',
        oldLine: null,
        newLine: 1,
        spans: [{ type: 'insert', text: 'new' }],
      },
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

describe('diff comparison options', () => {
  it('ignores all whitespace differences when ignoreWhitespace is true', () => {
    const left = 'const   a   =   1;'
    const right = 'const a = 1;'

    const withoutOption = diffTexts(left, right)
    expect(withoutOption.added).toBe(1)
    expect(withoutOption.removed).toBe(1)

    const withOption = diffTexts(left, right, { ignoreWhitespace: true })
    expect(withOption.added).toBe(0)
    expect(withOption.removed).toBe(0)
    expect(withOption.unchanged).toBe(1)
    expect(withOption.lines[0]?.text).toBe(left)
  })

  it('ignores trailing whitespace when ignoreTrailingWhitespace is true', () => {
    const left = 'line with trailing space   '
    const right = 'line with trailing space'

    const withoutOption = diffTexts(left, right)
    expect(withoutOption.added).toBe(1)
    expect(withoutOption.removed).toBe(1)

    const withOption = diffTexts(left, right, { ignoreTrailingWhitespace: true })
    expect(withOption.added).toBe(0)
    expect(withOption.removed).toBe(0)
    expect(withOption.unchanged).toBe(1)

    const internalDiff = diffTexts('a   b', 'a b', { ignoreTrailingWhitespace: true })
    expect(internalDiff.added).toBe(1)
    expect(internalDiff.removed).toBe(1)
  })

  it('ignores character case when ignoreCase is true', () => {
    const left = 'Hello World'
    const right = 'hello world'

    const withoutOption = diffTexts(left, right)
    expect(withoutOption.added).toBe(1)
    expect(withoutOption.removed).toBe(1)

    const withOption = diffTexts(left, right, { ignoreCase: true })
    expect(withOption.added).toBe(0)
    expect(withOption.removed).toBe(0)
    expect(withOption.unchanged).toBe(1)
    expect(withOption.lines[0]?.text).toBe(left)
  })

  it('ignores blank lines when ignoreBlankLines is true', () => {
    const left = 'first\n\nsecond\n\nthird'
    const right = 'first\nsecond\nthird'

    const withoutOption = diffTexts(left, right)
    expect(withoutOption.removed).toBe(2)

    const withOption = diffTexts(left, right, { ignoreBlankLines: true })
    expect(withOption.added).toBe(0)
    expect(withOption.removed).toBe(0)
    expect(withOption.unchanged).toBe(3)
  })

  it('distinguishes or ignores line endings based on ignoreLineEndings', () => {
    const left = 'first\r\nsecond\r\n'
    const right = 'first\nsecond\n'

    const withIgnore = diffTexts(left, right, { ignoreLineEndings: true })
    expect(withIgnore.added).toBe(0)
    expect(withIgnore.removed).toBe(0)
    expect(withIgnore.unchanged).toBe(2)

    const withoutIgnore = diffTexts(left, right, { ignoreLineEndings: false })
    expect(withoutIgnore.added).toBe(2)
    expect(withoutIgnore.removed).toBe(2)
  })
})

describe('diff memory guard and limits', () => {
  it('compares two 50,000-line divergent inputs without crashing or timeout', () => {
    const left = Array.from({ length: 50_000 }, (_, i) => `alpha-${i}`).join('\n')
    const right = Array.from({ length: 50_000 }, (_, i) => `beta-${i}`).join('\n')

    const start = performance.now()
    const result = diffTexts(left, right)
    const elapsed = performance.now() - start

    expect(result.added).toBe(50_000)
    expect(result.removed).toBe(50_000)
    expect(result.unchanged).toBe(0)
    expect(elapsed).toBeLessThan(2_000)
  })

  it('safely handles large near-divergent inputs with memory guard', () => {
    const left = Array.from({ length: 10_000 }, (_, i) => (i === 5_000 ? 'shared-line' : `left-${i}`)).join('\n')
    const right = Array.from({ length: 10_000 }, (_, i) => (i === 5_000 ? 'shared-line' : `right-${i}`)).join('\n')

    const start = performance.now()
    const result = diffTexts(left, right)
    const elapsed = performance.now() - start

    expect(result.lines.length).toBeGreaterThan(0)
    expect(elapsed).toBeLessThan(2_000)
  })

  it('sets warning when input exceeds 100,000 lines', () => {
    const input = Array.from({ length: 100_001 }, (_, i) => `line-${i}`).join('\n')
    const result = diffTexts(input, input)

    expect(result.warning).toBe('Input exceeds 100,000 lines. Comparison can take more time.')
  })
})
