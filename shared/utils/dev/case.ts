export function splitIntoWords(input: string): string[] {
  if (!input) {
    return []
  }

  // Insert space between lower/digit and upper, and between acronym and capitalized word
  const expanded = input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z0-9])/g, '$1 $2')

  return expanded
    .split(/[^a-z0-9]+/i)
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

export function toSlug(input: string): string {
  if (!input) {
    return ''
  }

  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
