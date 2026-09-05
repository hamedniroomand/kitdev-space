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
        // ponytail: Bun.XML needs one root and valid element names; sanitize + wrap.
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

/** Bun rejects multi-key roots and names with @, /, spaces, or leading digits. */
function toXmlDocument(value: unknown): Record<string, unknown> {
  if (!isPlainObject(value)) {
    return { root: value }
  }

  const sanitized = sanitizeXmlValue(value) as Record<string, unknown>
  const keys = Object.keys(sanitized)
  if (keys.length === 1 && isXmlName(keys[0]!)) {
    return sanitized
  }
  return { root: sanitized }
}

function sanitizeXmlValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => sanitizeXmlValue(item))
  }
  if (!isPlainObject(value)) {
    return value
  }

  const used = new Set<string>()
  const out: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    out[uniqueXmlName(toXmlName(key), used)] = sanitizeXmlValue(child)
  }
  return out
}

function toXmlName(key: string): string {
  const withoutAt = key.startsWith('@') ? key.slice(1) : key
  let name = withoutAt.replace(/[^A-Za-z0-9_.-]/g, '_')
  if (!/^[A-Za-z_]/.test(name)) {
    name = `_${name}`
  }
  return name || '_'
}

function uniqueXmlName(base: string, used: Set<string>): string {
  if (!used.has(base)) {
    used.add(base)
    return base
  }

  let index = 2
  let candidate = `${base}_${index}`
  while (used.has(candidate)) {
    index++
    candidate = `${base}_${index}`
  }
  used.add(candidate)
  return candidate
}

function isXmlName(name: string): boolean {
  return /^[A-Za-z_][\w.-]*$/.test(name)
}
