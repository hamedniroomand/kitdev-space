export type RandomCharset = 'alnum' | 'alpha' | 'numeric' | 'hex'

const CHARSETS: Record<RandomCharset, string> = {
  alnum: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  numeric: '0123456789',
  hex: '0123456789abcdef',
}

export function createRandomString(options: { length: number, charset: RandomCharset }): string {
  const length = Math.floor(options.length)
  if (length < 1 || length > 10_000) {
    throw new Error('Choose a length between 1 and 10000.')
  }

  const alphabet = CHARSETS[options.charset]
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
