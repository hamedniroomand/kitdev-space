export type EscapeMode = 'json' | 'javascript' | 'sql' | 'shell'

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
    case 'javascript': {
      const escapeLookup: Record<string, string> = {
        '\\\\': '\\',
        '\\\'': '\'',
        '\\"': '"',
        '\\n': '\n',
        '\\r': '\r',
        '\\t': '\t',
        '\\b': '\b',
        '\\f': '\f',
        '\\v': '\v',
        '\\0': '\0',
      }
      return text.replace(/\\(?:([\\'nrtbfv0"])|x([0-9a-fA-F]{2})|u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4}))/g, (match, ch, hex, ucode, u4) => {
        if (ch)
          return escapeLookup[`\\${ch}`] ?? ch
        if (hex)
          return String.fromCharCode(Number.parseInt(hex, 16))
        if (ucode)
          return String.fromCodePoint(Number.parseInt(ucode, 16))
        if (u4)
          return String.fromCharCode(Number.parseInt(u4, 16))
        return match
      })
    }
    case 'sql':
      return text.replace(/''/g, '\'')
    case 'shell':
      if (text.startsWith('\'') && text.endsWith('\'')) {
        return text.slice(1, -1).replace(/'\\''/g, '\'')
      }
      return text
  }
}
