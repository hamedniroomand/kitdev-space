export type RandomCharset = 'alnum' | 'alpha' | 'numeric' | 'hex'

export interface RandomStringOptions {
  length: number
  charset: RandomCharset
  includeSymbols?: boolean
  excludeAmbiguous?: boolean
}

const CHARSETS: Record<RandomCharset, string> = {
  alnum: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  numeric: '0123456789',
  hex: '0123456789abcdef',
}

export const RANDOM_SYMBOLS = '!@#$%^&*()-_=+[]{}'

export const AMBIGUOUS_CHARACTERS = '0Ol1I'

/**
 * Builds the alphabet of one draw. The symbols and the ambiguous filter change
 * the size of the alphabet, so each character then carries a different number
 * of bits. Both changes apply before a draw, never after one, because a filter
 * on the output makes the result biased.
 */
export function randomStringAlphabet(options: Omit<RandomStringOptions, 'length'>): string {
  let alphabet = CHARSETS[options.charset]
  if (options.includeSymbols) {
    alphabet += RANDOM_SYMBOLS
  }
  if (options.excludeAmbiguous) {
    alphabet = Array.from(alphabet, char => AMBIGUOUS_CHARACTERS.includes(char) ? '' : char).join('')
  }
  return alphabet
}

export function createRandomString(options: RandomStringOptions): string {
  const length = Math.floor(options.length)
  if (length < 1 || length > 10_000) {
    throw new Error('Choose a length between 1 and 10000.')
  }

  const alphabet = randomStringAlphabet(options)
  const charsCount = alphabet.length
  const maxValid = 256 - (256 % charsCount)

  let result = ''
  const batchSize = Math.max(length, 16)
  const buffer = new Uint8Array(batchSize)

  while (result.length < length) {
    crypto.getRandomValues(buffer)
    for (let i = 0; i < buffer.length && result.length < length; i++) {
      const byte = buffer[i]!
      if (byte < maxValid) {
        result += alphabet[byte % charsCount]
      }
    }
  }

  return result
}
