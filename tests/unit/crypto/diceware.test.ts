import { describe, expect, it } from 'vitest'
import {
  createDicewarePassphrase,
  estimateDicewareEntropyBits
} from '../../../shared/utils/crypto/diceware'
import { DICEWARE_WORDS } from '../../../shared/utils/crypto/diceware-wordlist'

describe('diceware', () => {
  it('embeds the EFF large word list', () => {
    expect(DICEWARE_WORDS).toHaveLength(7776)
  })

  it('generates the requested word count with separators', () => {
    const value = createDicewarePassphrase({
      wordCount: 5,
      separator: '-',
      capitalize: 'none'
    })
    const parts = value.split('-')
    expect(parts).toHaveLength(5)
    for (const part of parts) {
      expect(DICEWARE_WORDS).toContain(part)
    }
  })

  it('capitalizes words when requested', () => {
    const value = createDicewarePassphrase({
      wordCount: 4,
      separator: ' ',
      capitalize: 'all'
    })
    for (const part of value.split(' ')) {
      expect(part.charAt(0)).toBe(part.charAt(0).toUpperCase())
    }
  })

  it('estimates entropy from word count', () => {
    expect(estimateDicewareEntropyBits(6)).toBeGreaterThan(70)
  })
})
