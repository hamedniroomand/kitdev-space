import type { DataFormat } from '#shared/utils/data/types'
import { DataError } from '#shared/utils/data/errors'
import { parseJson } from '#shared/utils/data/json'
import { jsonToTypeScript } from '#shared/utils/data/typescript'

export type BunDataFormat = Exclude<DataFormat, 'typescript' | 'xml'>

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
      default:
        throw new DataError(`Unsupported format: ${format}`)
    }
  }
  catch (cause) {
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
      default:
        throw new DataError(`Unsupported format: ${format}`)
    }
  }
  catch (cause) {
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
  if (from === 'typescript' || from === 'xml' || to === 'xml') {
    throw new DataError(from === 'xml' || to === 'xml' ? 'XML converts in the browser.' : 'TypeScript is an output format only.')
  }

  const value = parseWithBun(input, from)

  if (to === 'typescript') {
    return jsonToTypeScript(value)
  }

  return serializeWithBun(value, to)
}
