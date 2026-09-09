/** Splits a JSON Pointer such as `#/a/0/b` into its decoded segments. */
export function parseJsonPointer(pointer: string): string[] {
  const body = pointer.replace(/^#/, '')
  if (!body || body === '/') {
    return []
  }
  return body
    .replace(/^\//, '')
    .split('/')
    .map(seg => seg.replace(/~1/g, '/').replace(/~0/g, '~'))
}

interface ScanState {
  index: number
}

function skipWhitespace(text: string, state: ScanState): void {
  while (state.index < text.length && /\s/.test(text[state.index]!)) {
    state.index++
  }
}

/** Reads a JSON string starting at the opening quote and returns its value. */
function readString(text: string, state: ScanState): string {
  let out = ''
  state.index++
  while (state.index < text.length) {
    const ch = text[state.index]!
    if (ch === '\\') {
      const next = text[state.index + 1]
      if (next === 'u') {
        out += String.fromCharCode(Number.parseInt(text.slice(state.index + 2, state.index + 6), 16))
        state.index += 6
        continue
      }
      const map: Record<string, string> = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f' }
      out += map[next ?? ''] ?? next ?? ''
      state.index += 2
      continue
    }
    if (ch === '"') {
      state.index++
      return out
    }
    out += ch
    state.index++
  }
  return out
}

function skipValue(text: string, state: ScanState): void {
  skipWhitespace(text, state)
  const ch = text[state.index]
  if (ch === '"') {
    readString(text, state)
    return
  }
  if (ch === '{' || ch === '[') {
    const open = ch
    const close = ch === '{' ? '}' : ']'
    let depth = 0
    while (state.index < text.length) {
      const cur = text[state.index]!
      if (cur === '"') {
        readString(text, state)
        continue
      }
      if (cur === open) {
        depth++
      }
      else if (cur === close) {
        depth--
        if (depth === 0) {
          state.index++
          return
        }
      }
      state.index++
    }
    return
  }
  while (state.index < text.length && !/[,}\]\s]/.test(text[state.index]!)) {
    state.index++
  }
}

/**
 * Walks the raw text to the position that a JSON Pointer names. It scans the
 * source instead of the parsed value, so the offset points at the original
 * characters. Returns the offset of the key when the parent is an object, and
 * the offset of the value when the parent is an array.
 */
export function findJsonPointerOffset(text: string, pointer: string): number | null {
  const segments = parseJsonPointer(pointer)
  const state: ScanState = { index: 0 }
  skipWhitespace(text, state)

  if (segments.length === 0) {
    return state.index < text.length ? state.index : null
  }

  for (let depth = 0; depth < segments.length; depth++) {
    const segment = segments[depth]!
    skipWhitespace(text, state)
    const container = text[state.index]

    if (container === '{') {
      state.index++
      let found = false
      while (state.index < text.length) {
        skipWhitespace(text, state)
        if (text[state.index] === '}') {
          state.index++
          break
        }
        if (text[state.index] !== '"') {
          state.index++
          continue
        }
        const keyOffset = state.index
        const key = readString(text, state)
        skipWhitespace(text, state)
        if (text[state.index] === ':') {
          state.index++
        }
        if (key === segment) {
          if (depth === segments.length - 1) {
            return keyOffset
          }
          found = true
          break
        }
        skipValue(text, state)
        skipWhitespace(text, state)
        if (text[state.index] === ',') {
          state.index++
        }
      }
      if (!found) {
        return null
      }
      continue
    }

    if (container === '[') {
      const wanted = Number(segment)
      if (!Number.isInteger(wanted) || wanted < 0) {
        return null
      }
      state.index++
      let position = 0
      let found = false
      while (state.index < text.length) {
        skipWhitespace(text, state)
        if (text[state.index] === ']') {
          state.index++
          break
        }
        const valueOffset = state.index
        if (position === wanted) {
          if (depth === segments.length - 1) {
            return valueOffset
          }
          found = true
          break
        }
        skipValue(text, state)
        skipWhitespace(text, state)
        if (text[state.index] === ',') {
          state.index++
        }
        position++
      }
      if (!found) {
        return null
      }
      continue
    }

    return null
  }

  return null
}
