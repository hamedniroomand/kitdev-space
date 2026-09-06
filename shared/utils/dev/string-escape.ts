export type EscapeMode = 'json' | 'javascript' | 'html' | 'sql' | 'shell'

export function escapeString(text: string, mode: EscapeMode): string {
  switch (mode) {
    case 'json':
      return JSON.stringify(text).slice(1, -1)
    case 'javascript':
      return text
        .replace(/\\/g, '\\\\')
        .replace(/'/g, '\\\'')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
    case 'html':
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    case 'sql':
      return text.replace(/'/g, '\'\'')
    case 'shell':
      return `'${text.replace(/'/g, '\'\\\'\'')}'`
  }
}

export function unescapeString(text: string, mode: EscapeMode): string {
  switch (mode) {
    case 'json':
      try {
        return JSON.parse(`"${text}"`)
      }
      catch {
        return text
      }
    case 'javascript':
      return text
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\'/g, '\'')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
    case 'html':
      return text
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, '\'')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
    case 'sql':
      return text.replace(/''/g, '\'')
    case 'shell':
      if (text.startsWith('\'') && text.endsWith('\'')) {
        return text.slice(1, -1).replace(/'\\''/g, '\'')
      }
      return text
  }
}
