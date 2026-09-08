import type { LoremMode } from '#shared/utils/data/lorem'
import { describe, expect, it } from 'vitest'
import {
  generateLorem,
  generateLoremParagraphs,
  generateLoremSentences,
  generateLoremWords,
} from '#shared/utils/data/lorem'

describe('lorem text', () => {
  it('generates the requested word count', () => {
    const words = generateLoremWords(12).split(/\s+/)
    expect(words).toHaveLength(12)
  })

  it('generates sentences with the requested count', () => {
    const text = generateLoremSentences(5)
    const sentences = text.split(/\.\s+/).filter(Boolean)
    expect(sentences).toHaveLength(5)
  })

  it('generates paragraphs with the requested count', () => {
    const text = generateLoremParagraphs(2)
    expect(text.split('\n\n')).toHaveLength(2)
  })

  it('strictly matches requested counts using generateLorem dispatcher', () => {
    expect(generateLorem('words', 8).trim().split(/\s+/)).toHaveLength(8)
    expect(generateLorem('sentences', 4).split(/\.\s+/).filter(Boolean)).toHaveLength(4)
    expect(generateLorem('paragraphs', 3).split(/\n{2,}/)).toHaveLength(3)
  })

  it('throws for invalid counts in all modes', () => {
    expect(() => generateLoremWords(0)).toThrow()
    expect(() => generateLoremWords(5001)).toThrow()
    expect(() => generateLoremSentences(0)).toThrow()
    expect(() => generateLoremSentences(501)).toThrow()
    expect(() => generateLoremParagraphs(0)).toThrow()
    expect(() => generateLoremParagraphs(51)).toThrow()
  })
})

describe('lorem count preservation across mode toggles', () => {
  it('preserves user-selected count when toggling between words, sentences, and paragraphs', () => {
    let mode: LoremMode = 'words'
    let count = 7

    function switchMode(newMode: LoremMode) {
      mode = newMode
      const max = newMode === 'words' ? 5000 : (newMode === 'sentences' ? 500 : 50)
      if (count > max) {
        count = max
      }
    }

    switchMode('sentences')
    expect(count).toBe(7)
    expect(mode).toBe('sentences')

    switchMode('paragraphs')
    expect(count).toBe(7)
    expect(mode).toBe('paragraphs')

    switchMode('words')
    expect(count).toBe(7)
    expect(mode).toBe('words')
  })

  it('clamps count only when switching to a mode with a lower maximum limit', () => {
    let mode: LoremMode = 'words'
    let count = 300

    function switchMode(newMode: LoremMode) {
      mode = newMode
      const max = newMode === 'words' ? 5000 : (newMode === 'sentences' ? 500 : 50)
      if (count > max) {
        count = max
      }
    }

    switchMode('sentences')
    expect(count).toBe(300)

    switchMode('paragraphs')
    expect(count).toBe(50)
    expect(mode).toBe('paragraphs')
  })
})
