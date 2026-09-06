import {
  parseJSON5,
  parseTOML,
  parseYAML,
  stringifyJSON5,
  stringifyTOML,
  stringifyYAML,
} from 'confbox'
import { DataError } from './errors'

/**
 * YAML, TOML, and JSON5 in the browser.
 *
 * `confbox` holds a reader and a writer for each of these three formats. It has
 * no dependency of its own and it tree-shakes, so the three formats together
 * cost about the same bundle bytes as a YAML-only library.
 *
 * The output is not byte-equal to the Bun writers that the server route uses.
 * Bun writes a space after a key that opens a block; these functions do not.
 * Each function here ends the text with one newline, which Bun does not do.
 */

/** Ends the text with exactly one newline, the shape a config file has. */
function withFinalNewline(text: string): string {
  return text.endsWith('\n') ? text : `${text}\n`
}

export function parseYamlText(text: string): unknown {
  try {
    return parseYAML(text)
  }
  catch (cause) {
    throw new DataError('Invalid YAML.\n\nCheck the syntax and try again.', { cause })
  }
}

export function stringifyYamlText(value: unknown): string {
  try {
    return withFinalNewline(stringifyYAML(value))
  }
  catch (cause) {
    throw new DataError('Could not write YAML.', { cause })
  }
}

export function parseTomlText(text: string): unknown {
  try {
    return parseTOML(text)
  }
  catch (cause) {
    throw new DataError('Invalid TOML.\n\nCheck the syntax and try again.', { cause })
  }
}

export function stringifyTomlText(value: unknown): string {
  if (Array.isArray(value)) {
    throw new DataError('TOML needs an object root.\n\nWrap the array in an object first.')
  }
  try {
    return withFinalNewline(stringifyTOML(value))
  }
  catch (cause) {
    throw new DataError('Could not write TOML.', { cause })
  }
}

export function parseJson5Text(text: string): unknown {
  try {
    return parseJSON5(text)
  }
  catch (cause) {
    throw new DataError('Invalid JSON5.\n\nCheck the syntax and try again.', { cause })
  }
}

export function stringifyJson5Text(value: unknown): string {
  try {
    return withFinalNewline(stringifyJSON5(value))
  }
  catch (cause) {
    throw new DataError('Could not write JSON5.', { cause })
  }
}
