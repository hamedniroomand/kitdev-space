export interface EnvDiagnostic {
  line: number
  message: string
  severity: 'error' | 'warning'
}

export interface EnvParseResult {
  data: Record<string, string>
  diagnostics: EnvDiagnostic[]
}

/**
 * Parses a .env text into a key-value record and returns diagnostic messages
 * for duplicate keys, invalid lines, and unclosed quotes.
 */
export function envToJsonWithDiagnostics(envText: string): EnvParseResult {
  const data: Record<string, string> = {}
  const diagnostics: EnvDiagnostic[] = []
  const seenKeys = new Map<string, number>()

  const lines = envText.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1
    const raw = lines[i]
    const trimmed = raw.trim()

    // Skip blanks and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    let cleaned = trimmed
    if (cleaned.startsWith('export ')) {
      cleaned = cleaned.slice(7).trim()
    }

    const equalIndex = cleaned.indexOf('=')
    if (equalIndex === -1) {
      diagnostics.push({
        line: lineNum,
        message: `Line ${lineNum}: Invalid line — no "=" found. The line is not a comment and has no assignment.`,
        severity: 'error',
      })
      continue
    }

    const key = cleaned.slice(0, equalIndex).trim()
    if (!key) {
      diagnostics.push({
        line: lineNum,
        message: `Line ${lineNum}: Invalid line — key is empty before "=".`,
        severity: 'error',
      })
      continue
    }

    let value = cleaned.slice(equalIndex + 1).trim()

    // Check for unclosed quotes
    const firstChar = value[0]
    if ((firstChar === '"' || firstChar === '\'') && !value.endsWith(firstChar)) {
      diagnostics.push({
        line: lineNum,
        message: `Line ${lineNum}: Unclosed ${firstChar === '"' ? 'double' : 'single'} quote in value for key "${key}".`,
        severity: 'error',
      })
      continue
    }

    // Unquote the value
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith('\'') && value.endsWith('\''))
    ) {
      const isDouble = value.startsWith('"')
      value = value.slice(1, -1)
      if (isDouble) {
        // Handle escape sequences in double-quoted values
        value = value
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
      }
    }
    else {
      // Remove trailing inline comments for unquoted values
      const commentIndex = value.indexOf(' #')
      if (commentIndex !== -1) {
        value = value.slice(0, commentIndex).trim()
      }
    }

    // Duplicate key detection
    if (seenKeys.has(key)) {
      diagnostics.push({
        line: lineNum,
        message: `Line ${lineNum}: Duplicate key "${key}" — first seen at line ${seenKeys.get(key)}.`,
        severity: 'warning',
      })
    }
    else {
      seenKeys.set(key, lineNum)
    }

    data[key] = value
  }

  return { data, diagnostics }
}

export function envToJson(envText: string): Record<string, string> {
  return envToJsonWithDiagnostics(envText).data
}

export function jsonToEnv(jsonInput: Record<string, unknown> | string): string {
  let parsed: Record<string, unknown>
  if (typeof jsonInput === 'string') {
    const raw = JSON.parse(jsonInput)
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      throw new Error('The JSON input must be an object. Arrays and other types are not supported.')
    }
    parsed = raw
  }
  else {
    parsed = jsonInput
  }

  const lines: string[] = []
  for (const [key, value] of Object.entries(parsed)) {
    if (value === null || value === undefined) {
      lines.push(`${key}=`)
      continue
    }

    const str = typeof value === 'object' ? JSON.stringify(value) : String(value)
    if (str.includes('\n') || str.includes(' ') || str.includes('"') || str.includes('\'')) {
      lines.push(`${key}="${str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`)
    }
    else {
      lines.push(`${key}=${str}`)
    }
  }

  return lines.join('\n')
}

/**
 * Generates an .env.example format: keys and comments are preserved,
 * all values are cleared.
 */
export function envToExample(envText: string): string {
  const lines = envText.split('\n')
  return lines.map((line) => {
    const trimmed = line.trim()
    // Preserve comments and blanks unchanged
    if (!trimmed || trimmed.startsWith('#')) {
      return line
    }

    let cleaned = trimmed
    const exportPrefix = cleaned.startsWith('export ') ? 'export ' : ''
    if (exportPrefix) {
      cleaned = cleaned.slice(7).trim()
    }

    const equalIndex = cleaned.indexOf('=')
    if (equalIndex === -1) {
      return line
    }

    const key = cleaned.slice(0, equalIndex).trim()
    if (!key) {
      return line
    }

    return `${exportPrefix}${key}=`
  }).join('\n')
}

/**
 * Masks all values in a parsed env record with asterisks.
 */
export function maskEnvValues(data: Record<string, string>): Record<string, string> {
  const masked: Record<string, string> = {}
  for (const key of Object.keys(data)) {
    masked[key] = '***'
  }
  return masked
}
