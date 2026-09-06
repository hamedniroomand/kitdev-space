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

export function formatJsonError(cause: unknown, input: string): DataError {
  if (cause instanceof SyntaxError) {
    const match = /position\s+(\d+)/i.exec(cause.message)
    const position = match ? Number(match[1]) : undefined
    if (position !== undefined && !Number.isNaN(position)) {
      const { line, column } = positionToLineColumn(input, position)
      return new DataError(
        `Invalid JSON.\n\nCheck the syntax near this point.\n\nLine ${line}, column ${column}.`,
        { line, column, position, cause },
      )
    }
  }

  return new DataError('Invalid JSON.\n\nCheck the syntax and try again.', { cause })
}
