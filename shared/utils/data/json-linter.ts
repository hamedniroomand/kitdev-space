import type { Diagnostic } from '@codemirror/lint'
import type { Extension } from '@codemirror/state'
import { linter } from '@codemirror/lint'
import { getJsonErrorPosition } from './errors'

export function jsonParseLinter() {
  return (view: { state: { doc: { toString: () => string, length: number } } }): Diagnostic[] => {
    const text = view.state.doc.toString()
    if (!text || !text.trim()) {
      return []
    }

    try {
      JSON.parse(text)
      return []
    }
    catch {
      const pos = getJsonErrorPosition(text)
      const from = pos ? Math.min(pos.position, view.state.doc.length) : 0
      const to = Math.min(from + 1, view.state.doc.length)
      const lineInfo = pos ? ` (Line ${pos.line}, column ${pos.column})` : ''
      return [{
        from,
        to: Math.max(to, from),
        severity: 'error',
        message: `Invalid JSON syntax${lineInfo}`,
      }]
    }
  }
}

export function createJsonLinter(): Extension {
  return linter(jsonParseLinter())
}
