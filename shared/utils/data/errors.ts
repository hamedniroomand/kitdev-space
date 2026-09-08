import { parser as jsonParser } from '@lezer/json'

export class DataError extends Error {
  line?: number
  column?: number
  position?: number

  constructor(
    message: string,
    options?: { line?: number, column?: number, position?: number, cause?: unknown },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined)
    this.name = 'DataError'
    this.line = options?.line
    this.column = options?.column
    this.position = options?.position
  }
}

export function positionToLineColumn(input: string, position: number): { line: number, column: number } {
  const safe = Math.max(0, Math.min(position, input.length))
  const before = input.slice(0, safe)
  const lines = before.split('\n')
  return {
    line: lines.length,
    column: (lines[lines.length - 1]?.length ?? 0) + 1,
  }
}

export function getJsonErrorPosition(input: string): { line: number, column: number, position: number } | null {
  try {
    const tree = jsonParser.parse(input)
    let errorPos: number | undefined
    tree.iterate({
      enter(node) {
        if (node.type.isError && errorPos === undefined) {
          errorPos = node.from
        }
      },
    })
    if (errorPos !== undefined) {
      const { line, column } = positionToLineColumn(input, errorPos)
      return { line, column, position: errorPos }
    }
  }
  catch {
    // If lezer parsing throws, return null
  }
  return null
}

export function formatJsonError(cause: unknown, input: string): DataError {
  if (cause instanceof SyntaxError) {
    const lezerPos = getJsonErrorPosition(input)
    if (lezerPos) {
      return new DataError(
        `Invalid JSON.\n\nCheck the syntax near this point.\n\nLine ${lezerPos.line}, column ${lezerPos.column}.`,
        { line: lezerPos.line, column: lezerPos.column, position: lezerPos.position, cause },
      )
    }

    const err = cause as SyntaxError & { line?: number, column?: number, position?: number }
    const match = /position\s+(\d+)/i.exec(cause.message)
    const position = match ? Number(match[1]) : (typeof err.position === 'number' ? err.position : undefined)
    if (position !== undefined && !Number.isNaN(position)) {
      const { line, column } = positionToLineColumn(input, position)
      return new DataError(
        `Invalid JSON.\n\nCheck the syntax near this point.\n\nLine ${line}, column ${column}.`,
        { line, column, position, cause },
      )
    }
    if (typeof err.line === 'number' && typeof err.column === 'number') {
      return new DataError(
        `Invalid JSON.\n\nCheck the syntax near this point.\n\nLine ${err.line}, column ${err.column}.`,
        { line: err.line, column: err.column, cause },
      )
    }
    const snippetMatch = /Unexpected token (?:'[^']*'|.+?), \.\.\."(.*?)" is not valid JSON/s.exec(cause.message)
    if (snippetMatch && snippetMatch[1]) {
      const snippet = snippetMatch[1]
      const idx = input.indexOf(snippet)
      if (idx !== -1) {
        const snippetPos = idx + snippet.length - 1
        const { line, column } = positionToLineColumn(input, snippetPos)
        return new DataError(
          `Invalid JSON.\n\nCheck the syntax near this point.\n\nLine ${line}, column ${column}.`,
          { line, column, position: snippetPos, cause },
        )
      }
    }
  }

  return new DataError('Invalid JSON.\n\nCheck the syntax and try again.', { cause })
}

export function formatYamlError(cause: unknown): DataError {
  if (cause && typeof cause === 'object') {
    const err = cause as {
      mark?: { line?: number, column?: number, position?: number }
      linePos?: Array<{ line: number, col: number }>
      message?: string
    }

    if (err.mark && typeof err.mark.line === 'number' && typeof err.mark.column === 'number') {
      const line = err.mark.line + 1
      const column = err.mark.column + 1
      const position = err.mark.position
      return new DataError(
        `Invalid YAML.\n\nCheck the syntax near this point.\n\nLine ${line}, column ${column}.`,
        { line, column, position, cause },
      )
    }

    if (err.linePos && err.linePos[0]) {
      const line = err.linePos[0].line
      const column = err.linePos[0].col
      return new DataError(
        `Invalid YAML.\n\nCheck the syntax near this point.\n\nLine ${line}, column ${column}.`,
        { line, column, cause },
      )
    }

    const match = /\((\d+):(\d+)\)/.exec(err.message ?? '')
    if (match && match[1] && match[2]) {
      const line = Number(match[1])
      const column = Number(match[2])
      return new DataError(
        `Invalid YAML.\n\nCheck the syntax near this point.\n\nLine ${line}, column ${column}.`,
        { line, column, cause },
      )
    }
  }

  return new DataError('Invalid YAML.\n\nCheck the syntax and try again.', { cause })
}
