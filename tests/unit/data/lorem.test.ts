import { describe, expect, it } from 'vitest'
import {
  generateLoremParagraphs,
  generateLoremWords
} from '#shared/utils/data/lorem'

describe('lorem text', () => {
  it('generates the requested word count', () => {
    const words = generateLoremWords(12).split(/\s+/)
    expect(words).toHaveLength(12)
  })

  it('generates paragraphs', () => {
    const text = generateLoremParagraphs(2)
    expect(text.split('\n\n')).toHaveLength(2)
  })
})
