import type { DataFormat } from './types'

/**
 * Detects potential data loss when converting between formats.
 * Follows ASD-STE100 for warning messages.
 */
export function detectConversionLossWarnings(
  input: string,
  from: DataFormat,
  to: DataFormat,
): string[] {
  const warnings: string[] = []
  const text = input.trim()
  if (!text) {
    return warnings
  }

  // 1. Comments loss: YAML, TOML, or JSON5 comments to other formats
  if (hasComments(text, from) && (to === 'json' || to === 'toml' || to === 'yaml')) {
    warnings.push('Comments are lost during conversion.')
  }

  // 2. YAML anchors and aliases loss
  if (from === 'yaml' && hasYamlAnchors(text)) {
    warnings.push('YAML anchors and aliases are expanded. Anchor references are lost during conversion.')
  }

  // 3. Date values loss: YAML or TOML dates converted to JSON/JSON5
  if ((from === 'yaml' || from === 'toml') && (to === 'json' || to === 'json5') && hasDates(text, from)) {
    warnings.push('Date values become strings during conversion to JSON.')
  }

  // 4. Null values loss: converting null to TOML
  if (to === 'toml' && hasNullValues(text)) {
    warnings.push('TOML does not support null values. Null values are lost or changed during conversion.')
  }

  return warnings
}

function hasComments(input: string, from: DataFormat): boolean {
  if (from === 'yaml' || from === 'toml') {
    return input.split('\n').some((line) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('#')) {
        return true
      }
      const hashIdx = line.indexOf('#')
      if (hashIdx === -1) {
        return false
      }
      if (!/\s/.test(line[hashIdx - 1] ?? '')) {
        return false
      }
      const before = line.slice(0, hashIdx)
      const singleQuotes = (before.match(/'/g) || []).length
      const doubleQuotes = (before.match(/"/g) || []).length
      return singleQuotes % 2 === 0 && doubleQuotes % 2 === 0
    })
  }
  if (from === 'json5' || from === 'json') {
    return /\/\/|\/\*/.test(input)
  }
  return false
}

function hasYamlAnchors(input: string): boolean {
  return /(?:^|[\s[{,])(?:&|\*)[\w-]+/m.test(input)
}

function hasDates(input: string, from: DataFormat): boolean {
  if (from === 'toml') {
    return /=\s*\d{4}-\d{2}-\d{2}/.test(input)
  }
  if (from === 'yaml') {
    return /:\s*\d{4}-\d{2}-\d{2}/.test(input)
  }
  return false
}

function hasNullValues(input: string): boolean {
  return /(?::\s*|\[\s*|,\s*|^)null\b/m.test(input)
}
