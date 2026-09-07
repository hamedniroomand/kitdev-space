import { DataError, formatJsonError } from './errors'
import { toStrictJson } from './json5'

/**
 * Parses JSON. When strict JSON fails, it retries with the JSON5 and JSONC
 * forms: comments, trailing commas, single quotes, and unquoted keys.
 */
export function parseJson(input: string): unknown {
  try {
    return JSON.parse(input)
  }
  catch (cause) {
    let strict: string | null = null
    try {
      strict = toStrictJson(input)
      return JSON.parse(strict)
    }
    catch (strictCause) {
      if (strict !== null) {
        throw formatJsonError(strictCause, strict)
      }
      throw formatJsonError(cause, input)
    }
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
  }
  catch (cause) {
    return {
      ok: false,
      error: cause instanceof DataError ? cause : formatJsonError(cause, input),
    }
  }
}
