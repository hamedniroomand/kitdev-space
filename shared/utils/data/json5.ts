/**
 * Converts the common JSON5 and JSONC forms into strict JSON.
 *
 * It walks the text one character at a time and tracks the string state, so a
 * "//" or a comma inside a string value is never changed. It covers the parts
 * that people paste from a config file: comments, trailing commas, single
 * quotes, and unquoted keys.
 *
 * It is not a full JSON5 parser. Hex numbers, a leading "+", and a plus
 * exponent are left for JSON.parse to reject.
 */

const IDENTIFIER_START = /[A-Z_$]/i
const IDENTIFIER_PART = /[\w$]/

function isWhitespace(char: string): boolean {
  return char === ' ' || char === '\t' || char === '\n' || char === '\r'
}

/** True when the text holds a form that strict JSON does not accept. */
export function looksLikeJson5(input: string): boolean {
  return input !== toStrictJson(input)
}

export function toStrictJson(input: string): string {
  let out = ''
  let index = 0

  while (index < input.length) {
    const char = input[index]!

    // A string is copied without a change, so its content stays exact.
    if (char === '"' || char === '\'') {
      const quote = char
      let value = ''
      index += 1

      while (index < input.length) {
        const inner = input[index]!

        if (inner === '\\') {
          const next = input[index + 1] ?? ''
          // JSON has no escaped single quote and no line continuation.
          if (next === '\'') {
            value += '\''
          }
          else if (next === '\n') {
            value += '\\n'
          }
          else {
            value += inner + next
          }
          index += 2
          continue
        }

        if (inner === quote) {
          index += 1
          break
        }

        // A double quote inside a single-quoted string needs an escape.
        value += inner === '"' ? '\\"' : inner
        index += 1
      }

      out += `"${value}"`
      continue
    }

    // Comments are not part of JSON.
    if (char === '/' && input[index + 1] === '/') {
      while (index < input.length && input[index] !== '\n') {
        index += 1
      }
      continue
    }

    if (char === '/' && input[index + 1] === '*') {
      index += 2
      while (index < input.length && !(input[index] === '*' && input[index + 1] === '/')) {
        index += 1
      }
      index += 2
      continue
    }

    // A trailing comma before } or ] is not valid JSON.
    if (char === ',') {
      let ahead = index + 1
      while (ahead < input.length && isWhitespace(input[ahead]!)) {
        ahead += 1
      }
      // Skip a comment that sits between the comma and the bracket.
      while (input[ahead] === '/' && (input[ahead + 1] === '/' || input[ahead + 1] === '*')) {
        if (input[ahead + 1] === '/') {
          while (ahead < input.length && input[ahead] !== '\n') {
            ahead += 1
          }
        }
        else {
          ahead += 2
          while (ahead < input.length && !(input[ahead] === '*' && input[ahead + 1] === '/')) {
            ahead += 1
          }
          ahead += 2
        }
        while (ahead < input.length && isWhitespace(input[ahead]!)) {
          ahead += 1
        }
      }

      if (input[ahead] === '}' || input[ahead] === ']') {
        index += 1
        continue
      }

      out += char
      index += 1
      continue
    }

    // An unquoted key needs quotes.
    if (IDENTIFIER_START.test(char)) {
      let word = ''
      let ahead = index
      while (ahead < input.length && IDENTIFIER_PART.test(input[ahead]!)) {
        word += input[ahead]!
        ahead += 1
      }

      let after = ahead
      while (after < input.length && isWhitespace(input[after]!)) {
        after += 1
      }

      // Only a word followed by a colon is a key. true, false, and null are values.
      const isKeyword = word === 'true' || word === 'false' || word === 'null'
      if (input[after] === ':' && !isKeyword) {
        out += `"${word}"`
      }
      else {
        out += word
      }

      index = ahead
      continue
    }

    out += char
    index += 1
  }

  return out
}
