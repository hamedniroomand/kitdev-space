import type { DiffLine } from '#shared/utils/data/diff'
import { describe, expect, it } from 'vitest'
import {
  applyWordDiff,
  diffLineWords,
  tokenizeWords,
} from '#shared/utils/data/word-diff'

describe('tokenizeWords', () => {
  it('splits line into words, spaces, and punctuation preserving exact text', () => {
    const text = 'const count: number = 42;'
    const tokens = tokenizeWords(text)
    expect(tokens.join('')).toBe(text)
    expect(tokens).toEqual([
      'const',
      ' ',
      'count',
      ':',
      ' ',
      'number',
      ' ',
      '=',
      ' ',
      '42',
      ';',
    ])
  })
})

describe('diffLineWords', () => {
  it('marks a single word modification in old and new spans', () => {
    const oldText = 'const name = "Alice";'
    const newText = 'const name = "Bob";'

    const { oldSpans, newSpans } = diffLineWords(oldText, newText)

    expect(oldSpans).toEqual([
      { type: 'equal', text: 'const name = "' },
      { type: 'delete', text: 'Alice' },
      { type: 'equal', text: '";' },
    ])

    expect(newSpans).toEqual([
      { type: 'equal', text: 'const name = "' },
      { type: 'insert', text: 'Bob' },
      { type: 'equal', text: '";' },
    ])
  })

  it('marks moved words with insert and delete spans', () => {
    const oldText = 'first second third'
    const newText = 'third first second'

    const { oldSpans, newSpans } = diffLineWords(oldText, newText)

    // In old text, "first second" is equal and " third" is deleted
    expect(oldSpans).toEqual([
      { type: 'equal', text: 'first second' },
      { type: 'delete', text: ' third' },
    ])

    // In new text, "third " is inserted and "first second" is equal
    expect(newSpans).toEqual([
      { type: 'insert', text: 'third ' },
      { type: 'equal', text: 'first second' },
    ])
  })

  it('handles word addition and deletion without throwing', () => {
    const { oldSpans, newSpans } = diffLineWords('alpha beta', 'alpha')
    expect(oldSpans).toEqual([
      { type: 'equal', text: 'alpha' },
      { type: 'delete', text: ' beta' },
    ])
    expect(newSpans).toEqual([
      { type: 'equal', text: 'alpha' },
    ])
  })
})

describe('applyWordDiff', () => {
  it('pairs deleted and inserted lines to attach word-level spans', () => {
    const lines: DiffLine[] = [
      { type: 'equal', text: 'export function hello() {', oldLine: 1, newLine: 1 },
      { type: 'delete', text: '  return "hello Alice";', oldLine: 2, newLine: null },
      { type: 'insert', text: '  return "hello Bob";', oldLine: null, newLine: 2 },
      { type: 'equal', text: '}', oldLine: 3, newLine: 3 },
    ]

    const result = applyWordDiff(lines)
    expect(result[1]?.spans).toBeDefined()
    expect(result[2]?.spans).toBeDefined()

    expect(result[1]?.spans).toEqual([
      { type: 'equal', text: '  return "hello ' },
      { type: 'delete', text: 'Alice' },
      { type: 'equal', text: '";' },
    ])

    expect(result[2]?.spans).toEqual([
      { type: 'equal', text: '  return "hello ' },
      { type: 'insert', text: 'Bob' },
      { type: 'equal', text: '";' },
    ])
  })

  it('handles unequal numbers of deletes and inserts gracefully', () => {
    const lines: DiffLine[] = [
      { type: 'delete', text: 'line 1 old', oldLine: 1, newLine: null },
      { type: 'delete', text: 'line 2 old', oldLine: 2, newLine: null },
      { type: 'insert', text: 'line 1 new', oldLine: null, newLine: 1 },
    ]

    const result = applyWordDiff(lines)
    // First pair has spans
    expect(result[0]?.spans).toBeDefined()
    expect(result[2]?.spans).toBeDefined()
    // Unpaired second delete line has no spans
    expect(result[1]?.spans).toBeUndefined()
  })
})
