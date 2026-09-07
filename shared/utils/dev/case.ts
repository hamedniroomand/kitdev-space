export function splitIntoWords(input: string): string[] {
  if (!input) {
    return []
  }

  // Insert space between lower/digit and upper, and between acronym and capitalized word
  const expanded = input
    .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, '$1 $2')
    .replace(/(\p{Lu}+)(\p{Lu}[\p{Ll}\p{N}])/gu, '$1 $2')

  return expanded
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
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
