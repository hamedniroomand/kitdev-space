import type { DataFormat } from './types'
import { DataError } from './errors'
import { parseJson } from './json'
import {
  parseJson5Text,
  parseTomlText,
  parseYamlText,
  stringifyJson5Text,
  stringifyTomlText,
  stringifyYamlText
} from './text-formats'
import { jsonToTypeScript } from './typescript'
import { parseXml, stringifyXml } from './xml'

/**
 * Data conversion in the browser.
 *
 * JSON, YAML, TOML, and JSON5 need no server, because `confbox` reads and
 * writes all of them. XML uses the `DOMParser` of the browser. Every format
 * converts on the page, and `canConvertInBrowser` only rejects TypeScript as
 * an input, because it is an output format.
 */

const READ_FORMATS = new Set<DataFormat>(['json', 'yaml', 'toml', 'json5', 'xml'])
const WRITE_FORMATS = new Set<DataFormat>(['json', 'yaml', 'toml', 'json5', 'xml', 'typescript'])

export function canConvertInBrowser(from: DataFormat, to: DataFormat): boolean {
  return READ_FORMATS.has(from) && WRITE_FORMATS.has(to)
}

function parseInBrowser(text: string, from: DataFormat): unknown {
  switch (from) {
    case 'json':
      return parseJson(text)
    case 'yaml':
      return parseYamlText(text)
    case 'toml':
      return parseTomlText(text)
    case 'json5':
      return parseJson5Text(text)
    case 'xml':
      return parseXml(text)
    default:
      throw new DataError('This format is an output format only.')
  }
}

function serializeInBrowser(value: unknown, to: DataFormat): string {
  switch (to) {
    case 'json':
      return JSON.stringify(value, null, 2)
    case 'yaml':
      return stringifyYamlText(value)
    case 'toml':
      return stringifyTomlText(value)
    case 'json5':
      return stringifyJson5Text(value)
    case 'xml':
      return stringifyXml(value)
    case 'typescript':
      return jsonToTypeScript(value)
    default:
      throw new DataError('Unsupported format.')
  }
}

export function convertInBrowser(input: string, from: DataFormat, to: DataFormat): string {
  if (!canConvertInBrowser(from, to)) {
    throw new DataError('TypeScript is an output format only.')
  }

  const text = input.trim()
  if (!text) {
    throw new DataError('Enter input before you run the tool.')
  }

  return serializeInBrowser(parseInBrowser(text, from), to)
}
