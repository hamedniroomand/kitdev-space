// A combining mark (\p{M}) is part of the letter before it. Accents in decomposed text are marks.
const LOWER_TO_UPPER = /([\p{Ll}\p{N}]\p{M}*)(\p{Lu})/gu
const ACRONYM_TO_WORD = /((?:\p{Lu}\p{M}*)+)(\p{Lu}\p{M}*[\p{Ll}\p{N}])/gu
const SEPARATORS = /[^\p{L}\p{N}\p{M}]+/u

export function splitIntoWords(input: string): string[] {
  if (!input) {
    return []
  }

  // Insert space between lower/digit and upper, and between acronym and capitalized word
  const expanded = input
    .replace(LOWER_TO_UPPER, '$1 $2')
    .replace(ACRONYM_TO_WORD, '$1 $2')

  return expanded
    .split(SEPARATORS)
    .filter(Boolean)
}

/**
 * Convert each line of the text on its own.
 *
 * It keeps empty lines and the original line endings.
 */
export function convertLines(input: string, convert: (line: string) => string): string {
  return input
    .split(/(\r\n|\r|\n)/)
    .map((part, index) => (index % 2 === 0 ? convert(part) : part))
    .join('')
}

export function toCamelCase(input: string): string {
  const words = splitIntoWords(input)
  if (words.length === 0) {
    return ''
  }

  return words
    .map((word, index) => {
      const lower = word.toLowerCase()
      if (index === 0) {
        return lower
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join('')
}

export function toPascalCase(input: string): string {
  const words = splitIntoWords(input)
  return words
    .map((word) => {
      const lower = word.toLowerCase()
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join('')
}

export function toSnakeCase(input: string): string {
  const words = splitIntoWords(input)
  return words.map(word => word.toLowerCase()).join('_')
}

export function toKebabCase(input: string): string {
  const words = splitIntoWords(input)
  return words.map(word => word.toLowerCase()).join('-')
}

export function toConstantCase(input: string): string {
  const words = splitIntoWords(input)
  return words.map(word => word.toUpperCase()).join('_')
}

const TRANSLITERATION_MAP: Record<string, string> = {
  ß: 'ss',
  ø: 'o',
  Ø: 'o',
  æ: 'ae',
  Æ: 'ae',
  đ: 'd',
  Đ: 'd',
  ł: 'l',
  Ł: 'l',
}

export function toSlug(input: string): string {
  if (!input) {
    return ''
  }

  let text = input
  for (const [char, replacement] of Object.entries(TRANSLITERATION_MAP)) {
    text = text.replaceAll(char, replacement)
  }

  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
