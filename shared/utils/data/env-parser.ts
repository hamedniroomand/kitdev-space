export function envToJson(envText: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = envText.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    let cleaned = trimmed
    if (cleaned.startsWith('export ')) {
      cleaned = cleaned.slice(7).trim()
    }

    const equalIndex = cleaned.indexOf('=')
    if (equalIndex === -1) {
      continue
    }

    const key = cleaned.slice(0, equalIndex).trim()
    let value = cleaned.slice(equalIndex + 1).trim()

    // Handle quoted values
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith('\'') && value.endsWith('\''))
    ) {
      value = value.slice(1, -1)
      if (cleaned.slice(equalIndex + 1).trim().startsWith('"')) {
        value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\"/g, '"')
      }
    }
    else {
      // Remove trailing inline comments for unquoted values
      const commentIndex = value.indexOf(' #')
      if (commentIndex !== -1) {
        value = value.slice(0, commentIndex).trim()
      }
    }

    if (key) {
      result[key] = value
    }
  }

  return result
}

export function jsonToEnv(jsonInput: Record<string, unknown> | string): string {
  let parsed: Record<string, unknown>
  if (typeof jsonInput === 'string') {
    parsed = JSON.parse(jsonInput)
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
