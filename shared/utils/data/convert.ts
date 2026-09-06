import type { DataFormat } from './types'
import { DataError } from './errors'
import { parseJson } from './json'
import { jsonToTypeScript } from './typescript'
import { parseYaml, stringifyYaml } from './yaml'

/**
 * Data conversion in the browser.
 *
 * JSON and YAML need no server. TOML, XML, and JSON5 need `Bun.TOML`,
 * `Bun.XML`, and `Bun.JSON5`, so `/api/data/transform` keeps those.
 * `canConvertInBrowser` says which path a tool must take.
 */

const READ_FORMATS = new Set<DataFormat>(['json', 'yaml'])
const WRITE_FORMATS = new Set<DataFormat>(['json', 'yaml', 'typescript'])

export function canConvertInBrowser(from: DataFormat, to: DataFormat): boolean {
  return READ_FORMATS.has(from) && WRITE_FORMATS.has(to)
}

export function convertInBrowser(input: string, from: DataFormat, to: DataFormat): string {
  if (!canConvertInBrowser(from, to)) {
    throw new DataError('This format needs the server.')
  }

  const text = input.trim()
  if (!text) {
    throw new DataError('Enter input before you run the tool.')
  }

  const value = from === 'json' ? parseJson(text) : parseYaml(text)

  if (to === 'typescript') {
    return jsonToTypeScript(value)
  }
  if (to === 'json') {
    return JSON.stringify(value, null, 2)
  }
  return stringifyYaml(value)
}
