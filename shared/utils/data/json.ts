import { DataError, formatJsonError } from './errors'

export function parseJson(input: string): unknown {
  try {
    return JSON.parse(input)
  } catch (cause) {
    throw formatJsonError(cause, input)
  }
}

export function formatJson(input: string, space = 2): string {
  return JSON.stringify(parseJson(input), null, space)
}

export function minifyJson(input: string): string {
  return JSON.stringify(parseJson(input))
}

export function validateJson(input: string): { ok: true } | { ok: false, error: DataError } {
  try {
    parseJson(input)
    return { ok: true }
  } catch (cause) {
    return {
      ok: false,
      error: cause instanceof DataError ? cause : formatJsonError(cause, input)
    }
  }
}
