import { DataError, formatJsonError } from './errors'
import { toStrictJson } from './json5'
import { sortKeys as sortObjectKeys } from './stable-json'

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

export type JsonIndentOption = '2' | '4' | 'tab' | 'compact' | number | string

export function formatJson(
  input: string,
  space: JsonIndentOption = 2,
  sortKeys = false,
): string {
  let parsed = parseJson(input)
  if (sortKeys) {
    parsed = sortObjectKeys(parsed)
  }
  if (space === 'compact' || space === 0 || space === '0') {
    return JSON.stringify(parsed)
  }
  const resolvedSpace = space === 'tab' ? '\t' : (typeof space === 'string' && /^\d+$/.test(space) ? Number(space) : space)
  return JSON.stringify(parsed, null, resolvedSpace as number | string)
}

export function minifyJson(input: string, sortKeys = false): string {
  let parsed = parseJson(input)
  if (sortKeys) {
    parsed = sortObjectKeys(parsed)
  }
  return JSON.stringify(parsed)
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

export interface JsonWarning {
  type: 'precision' | 'duplicate_key'
  message: string
}

export function detectJsonWarnings(input: string): JsonWarning[] {
  const warnings: JsonWarning[] = []
  let index = 0
  const scopeStack: Array<{ type: 'object' | 'array', keys: Set<string> }> = []

  function skipWhitespaceAndComments() {
    while (index < input.length) {
      const char = input[index]
      if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
        index++
        continue
      }
      if (char === '/' && input[index + 1] === '/') {
        index += 2
        while (index < input.length && input[index] !== '\n') {
          index++
        }
        continue
      }
      if (char === '/' && input[index + 1] === '*') {
        index += 2
        while (index < input.length && !(input[index] === '*' && input[index + 1] === '/')) {
          index++
        }
        index += 2
        continue
      }
      break
    }
  }

  function peekNextChar(): string | null {
    let i = index
    while (i < input.length) {
      const char = input[i]
      if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
        i++
        continue
      }
      if (char === '/' && input[i + 1] === '/') {
        i += 2
        while (i < input.length && input[i] !== '\n') {
          i++
        }
        continue
      }
      if (char === '/' && input[i + 1] === '*') {
        i += 2
        while (i < input.length && !(input[i] === '*' && input[i + 1] === '/')) {
          i++
        }
        i += 2
        continue
      }
      return char ?? null
    }
    return null
  }

  while (index < input.length) {
    skipWhitespaceAndComments()
    if (index >= input.length) {
      break
    }

    const char = input[index]!

    if (char === '{') {
      scopeStack.push({ type: 'object', keys: new Set() })
      index++
      continue
    }

    if (char === '}') {
      if (scopeStack.length > 0 && scopeStack[scopeStack.length - 1]!.type === 'object') {
        scopeStack.pop()
      }
      index++
      continue
    }

    if (char === '[') {
      scopeStack.push({ type: 'array', keys: new Set() })
      index++
      continue
    }

    if (char === ']') {
      if (scopeStack.length > 0 && scopeStack[scopeStack.length - 1]!.type === 'array') {
        scopeStack.pop()
      }
      index++
      continue
    }

    if (char === '"' || char === '\'') {
      const quote = char
      index++
      let str = ''
      while (index < input.length) {
        const c = input[index]!
        if (c === '\\') {
          index++
          if (index < input.length) {
            str += input[index]
            index++
          }
          continue
        }
        if (c === quote) {
          index++
          break
        }
        str += c
        index++
      }

      const currentScope = scopeStack[scopeStack.length - 1]
      if (currentScope?.type === 'object') {
        const nextChar = peekNextChar()
        if (nextChar === ':') {
          if (currentScope.keys.has(str)) {
            warnings.push({
              type: 'duplicate_key',
              message: `Duplicate key "${str}" in object. The second value replaces the first value.`,
            })
          }
          else {
            currentScope.keys.add(str)
          }
        }
      }
      continue
    }

    if ((char >= '0' && char <= '9') || (char === '-' && input[index + 1] && input[index + 1]! >= '0' && input[index + 1]! <= '9')) {
      const start = index
      if (char === '-') {
        index++
      }
      while (index < input.length && /[0-9.e+-]/i.test(input[index]!)) {
        index++
      }
      const numStr = input.slice(start, index)
      if (/^-?\d+$/.test(numStr)) {
        try {
          const val = BigInt(numStr)
          if (val > 9007199254740991n || val < -9007199254740991n) {
            warnings.push({
              type: 'precision',
              message: `Integer ${numStr} exceeds safe precision (2^53 - 1). The value can lose precision.`,
            })
          }
        }
        catch {
          // Ignore invalid integer
        }
      }
      continue
    }

    if (/[a-z_$]/i.test(char)) {
      const start = index
      while (index < input.length && /[\w$]/.test(input[index]!)) {
        index++
      }
      const ident = input.slice(start, index)
      const currentScope = scopeStack[scopeStack.length - 1]
      if (currentScope?.type === 'object') {
        const nextChar = peekNextChar()
        if (nextChar === ':') {
          if (currentScope.keys.has(ident)) {
            warnings.push({
              type: 'duplicate_key',
              message: `Duplicate key "${ident}" in object. The second value replaces the first value.`,
            })
          }
          else {
            currentScope.keys.add(ident)
          }
        }
      }
      continue
    }

    index++
  }

  return warnings
}
