import { DICEWARE_WORDS } from './diceware-wordlist'

export type DicewareCapitalize = 'none' | 'first' | 'all'

export interface DicewareOptions {
  wordCount: number
  separator: string
  capitalize: DicewareCapitalize
}

function pickIndex(max: number): number {
  if (max <= 0) {
    throw new Error('Word list is empty.')
  }
  const limit = Math.floor(0x100000000 / max) * max
  const buf = new Uint32Array(1)
  do {
    crypto.getRandomValues(buf)
  } while (buf[0]! >= limit)
  return buf[0]! % max
}

function formatWord(word: string, capitalize: DicewareCapitalize, index: number): string {
  if (capitalize === 'all' || (capitalize === 'first' && index === 0)) {
    return word.charAt(0).toUpperCase() + word.slice(1)
  }
  return word
}

export function createDicewarePassphrase(options: DicewareOptions): string {
  const wordCount = Math.floor(options.wordCount)
  if (wordCount < 3 || wordCount > 12) {
    throw new Error('Choose a word count between 3 and 12.')
  }
  if (options.separator.length > 8) {
    throw new Error('Separator must be 8 characters or fewer.')
  }

  const words: string[] = []
  for (let i = 0; i < wordCount; i += 1) {
    const word = DICEWARE_WORDS[pickIndex(DICEWARE_WORDS.length)]!
    words.push(formatWord(word, options.capitalize, i))
  }
  return words.join(options.separator)
}

export function estimateDicewareEntropyBits(wordCount: number): number {
  const count = Math.floor(wordCount)
  if (count < 1) {
    return 0
  }
  return Math.round(count * Math.log2(DICEWARE_WORDS.length) * 10) / 10
}
