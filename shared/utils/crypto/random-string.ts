export type RandomCharset = 'alnum' | 'alpha' | 'numeric' | 'hex'

const CHARSETS: Record<RandomCharset, string> = {
  alnum: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  numeric: '0123456789',
  hex: '0123456789abcdef'
}

export function createRandomString(options: { length: number, charset: RandomCharset }): string {
  const length = Math.floor(options.length)
  if (length < 1 || length > 10_000) {
    throw new Error('Choose a length between 1 and 10000.')
  }

  const alphabet = CHARSETS[options.charset]
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)

  let result = ''
  for (const byte of bytes) {
    result += alphabet[byte % alphabet.length]
  }
  return result
}
