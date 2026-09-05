import type { DataFormat } from '../../../shared/utils/data/types'
import { DataError } from '../../../shared/utils/data/errors'
import { parseJson } from '../../../shared/utils/data/json'
import { jsonToTypeScript } from '../../../shared/utils/data/typescript'

export type BunDataFormat = Exclude<DataFormat, 'typescript'>

export function parseWithBun(input: string, format: BunDataFormat): unknown {
  const text = input.trim()
  if (!text) {
    throw new DataError('Enter input before you run the tool.')
  }

  try {
    switch (format) {
      case 'json':
        return parseJson(text)
      case 'json5':
        return Bun.JSON5.parse(text)
      case 'yaml':
        return Bun.YAML.parse(text)
      case 'toml':
        return Bun.TOML.parse(text)
      case 'xml':
        return Bun.XML.parse(text)
      default:
        throw new DataError(`Unsupported format: ${format}`)
    }
  } catch (cause) {
    if (cause instanceof DataError) {
      throw cause
    }
    throw new DataError(`Invalid ${String(format).toUpperCase()}.\n\nCheck the syntax and try again.`, { cause })
  }
}

export function serializeWithBun(value: unknown, format: BunDataFormat): string {
  try {
    switch (format) {
      case 'json':
        return JSON.stringify(value, null, 2)
      case 'json5':
        return requireText(Bun.JSON5.stringify(value, null, 2), format)
      case 'yaml':
        return requireText(Bun.YAML.stringify(value, null, 2), format)
      case 'toml':
        return requireText(Bun.TOML.stringify(value), format)
      case 'xml': {
        // ponytail: Bun.XML needs one root; invalid names use <item key="...">.
        if (Array.isArray(value)) {
          throw new DataError('XML needs an object root.\n\nWrap the array in an object first.')
        }
        return requireText(Bun.XML.stringify(toXmlDocument(value), null, 2), format)
      }
      default:
        throw new DataError(`Unsupported format: ${format}`)
    }
  } catch (cause) {
    if (cause instanceof DataError) {
      throw cause
    }
    throw new DataError(`Could not write ${String(format).toUpperCase()}.`, { cause })
  }
}

function requireText(value: string | undefined, format: BunDataFormat): string {
  if (value === undefined) {
    throw new DataError(`Could not write ${format.toUpperCase()}.`)
  }
  return value
}

export function transformWithBun(input: string, from: DataFormat, to: DataFormat): string {
  if (from === 'typescript') {
    throw new DataError('TypeScript is an output format only.')
  }

  const value = parseWithBun(input, from)

  if (to === 'typescript') {
    return jsonToTypeScript(value)
  }

  return serializeWithBun(value, to)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toXmlDocument(value: unknown): Record<string, unknown> {
  if (!isPlainObject(value)) {
    return { root: encodeXmlValue(value) }
  }

  const encoded = encodeXmlObject(value)
  const keys = Object.keys(encoded)
  if (keys.length === 1 && isXmlElementName(keys[0]!)) {
    return encoded
  }
  return { root: encoded }
}

function encodeXmlValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => encodeXmlValue(item))
  }
  if (!isPlainObject(value)) {
    return value
  }
  return encodeXmlObject(value)
}

function encodeXmlObject(value: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const items: unknown[] = []

  for (const [key, child] of Object.entries(value)) {
    if (isXmlElementName(key)) {
      const encoded = encodeXmlValue(child)
      if (key === 'item') {
        if (Array.isArray(encoded)) {
          items.push(...encoded)
        } else {
          items.push(encoded)
        }
      } else {
        out[key] = encoded
      }
    } else {
      items.push(encodeKeyedItem(key, child))
    }
  }

  if (items.length === 1) {
    out.item = items[0]
  } else if (items.length > 1) {
    out.item = items
  }

  return out
}

function encodeKeyedItem(key: string, value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) {
    return { '@key': key, 'item': value.map(item => encodeXmlValue(item)) }
  }
  if (isPlainObject(value)) {
    return { '@key': key, ...encodeXmlObject(value) }
  }
  return { '@key': key, '#text': value }
}

/** Names Bun can use as elements. Reject @/# which Bun treats as attributes/text. */
function isXmlElementName(name: string): boolean {
  if (name.startsWith('@') || name.startsWith('#')) {
    return false
  }
  return /^[A-Za-z_][\w.-]*$/.test(name)
}
