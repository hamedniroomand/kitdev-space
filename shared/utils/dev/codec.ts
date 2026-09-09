import { base64ToBytes, bytesToBase64, decodeBase64, encodeBase64 } from '#shared/utils/crypto/base64'
import { decodeHex, encodeHex } from '#shared/utils/crypto/hex'
import { htmlEntityDecode, htmlEntityEncode, urlEncode } from './html-url'
import { escapeString, unescapeString } from './string-escape'

/**
 * One encode and escape tool.
 *
 * Base64, hex, URL, HTML, and the language escapes all answer the same
 * question: make this text safe for another place. Each format reuses the
 * utility that already exists.
 */

export type CodecFormat
  = | 'base64'
    | 'base64url'
    | 'hex'
    | 'url'
    | 'html'
    | 'json'
    | 'javascript'
    | 'sql'
    | 'shell'

/** `component` follows encodeURIComponent. `full` follows encodeURI. */
export type UrlScope = 'component' | 'full'

export interface CodecOptions {
  urlScope?: UrlScope
}

export interface CodecOption {
  label: string
  value: CodecFormat
  hint: string
}

export const CODEC_OPTIONS: CodecOption[] = [
  { label: 'Base64', value: 'base64', hint: 'Standard Base64 with padding.' },
  { label: 'Base64 URL', value: 'base64url', hint: 'URL-safe Base64 with no padding. Used by JWT.' },
  { label: 'Hex', value: 'hex', hint: 'Two hex digits for each byte.' },
  { label: 'URL', value: 'url', hint: 'Percent encoding for a query value or a full URL.' },
  { label: 'HTML entities', value: 'html', hint: 'Makes text safe inside HTML.' },
  { label: 'JSON string', value: 'json', hint: 'Escapes for a JSON string value.' },
  { label: 'JavaScript string', value: 'javascript', hint: 'Escapes quotes, newlines, and tabs.' },
  { label: 'SQL string', value: 'sql', hint: 'Doubles a single quote.' },
  { label: 'Shell argument', value: 'shell', hint: 'Quotes text for a shell command.' },
]

/** An error that names the exact 0-indexed offset of the character that failed. */
export class CodecError extends Error {
  readonly offset: number
  readonly character: string

  constructor(message: string, offset: number, character: string) {
    super(message)
    this.name = 'CodecError'
    this.offset = offset
    this.character = character
  }
}

// Whitespace is allowed, because atob ignores it.
const BASE64_ALLOWED = /[a-z0-9+/=\s]/i
// The URL-safe alphabet also accepts the standard characters, because
// fromBase64Url passes them through.
const BASE64URL_ALLOWED = /[\w+/=\-\s]/
const DATA_URL_MARKER = ';base64,'
const PERCENT_ESCAPE = /^%[0-9a-f]{2}$/i
const ESCAPE_RUN = /(?:%[0-9a-f]{2})+/gi

/** Throws a CodecError for the first character that the alphabet does not hold. */
function assertAlphabet(text: string, allowed: RegExp, label: string, base = 0): void {
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!
    if (!allowed.test(character)) {
      const offset = base + index
      throw new CodecError(
        `Invalid ${label} character "${character}" at offset ${offset}.`,
        offset,
        character,
      )
    }
  }
}

/** Throws a CodecError for the first percent sign without two hex digits. */
function assertPercentEscapes(text: string): void {
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== '%') {
      continue
    }
    const sequence = text.slice(index, index + 3)
    if (!PERCENT_ESCAPE.test(sequence)) {
      throw new CodecError(
        `Invalid percent escape "${sequence}" at offset ${index}.`,
        index,
        '%',
      )
    }
  }
}

/**
 * Reports the escape run that is not a valid UTF-8 character. A run such as
 * `%C3` has the correct syntax, but it is only half of a character.
 */
function throwBadUtf8Escape(text: string): never {
  for (const match of text.matchAll(ESCAPE_RUN)) {
    try {
      decodeURIComponent(match[0])
    }
    catch {
      const offset = match.index
      throw new CodecError(
        `The escape "${match[0]}" at offset ${offset} is not a valid UTF-8 character.`,
        offset,
        '%',
      )
    }
  }
  throw new Error('The percent escapes do not form a valid UTF-8 character.')
}

function toBase64Url(value: string): string {
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): string {
  const padded = value.trim().replace(/-/g, '+').replace(/_/g, '/')
  return padded + '='.repeat((4 - (padded.length % 4)) % 4)
}

export function encodeWith(text: string, format: CodecFormat, options: CodecOptions = {}): string {
  switch (format) {
    case 'base64':
      return encodeBase64(text)
    case 'base64url':
      return toBase64Url(encodeBase64(text))
    case 'hex':
      return encodeHex(text)
    case 'url':
      return options.urlScope === 'full' ? encodeURI(text) : urlEncode(text)
    case 'html':
      return htmlEntityEncode(text)
    default:
      return escapeString(text, format)
  }
}

export function decodeWith(text: string, format: CodecFormat, options: CodecOptions = {}): string {
  switch (format) {
    case 'base64':
      assertAlphabet(text, BASE64_ALLOWED, 'Base64')
      return decodeBase64(text)
    case 'base64url':
      assertAlphabet(text, BASE64URL_ALLOWED, 'Base64')
      return decodeBase64(fromBase64Url(text))
    case 'hex':
      return decodeHex(text)
    case 'url': {
      assertPercentEscapes(text)
      try {
        return options.urlScope === 'full' ? decodeURI(text) : decodeURIComponent(text)
      }
      catch {
        return throwBadUtf8Escape(text)
      }
    }
    case 'html':
      return htmlEntityDecode(text)
    default:
      return unescapeString(text, format)
  }
}

/** A Base64 data URL for the bytes of a file. */
export function buildDataUrl(mime: string, bytes: Uint8Array): string {
  return `data:${mime || 'application/octet-stream'};base64,${bytesToBase64(bytes)}`
}

export interface DataUrlParts {
  mime: string
  data: string
}

/** The parts of a Base64 data URL, or null when the text is not one. */
export function parseDataUrl(text: string): DataUrlParts | null {
  const match = /^data:([^;,]*);base64,([\s\S]*)$/.exec(text.trim())
  if (!match) {
    return null
  }
  return { mime: match[1] || 'application/octet-stream', data: match[2]! }
}

/** A file extension for a MIME type. `bin` when the subtype is not a plain word. */
export function extensionForMime(mime: string): string {
  const subtype = mime.split('/')[1]?.split('+')[0]?.toLowerCase() ?? ''
  if (subtype === 'jpeg') {
    return 'jpg'
  }
  return /^[a-z0-9]+$/.test(subtype) ? subtype : 'bin'
}

export interface BinaryPayload {
  bytes: Uint8Array
  mime: string
  extension: string
}

/**
 * The bytes behind a Base64 data URL or a plain Base64 payload. The bytes stay
 * binary, so a file never goes through a text decoder.
 */
export function decodeBinaryBase64(text: string): BinaryPayload {
  const parsed = parseDataUrl(text)
  const data = parsed?.data ?? text
  const base = parsed ? text.indexOf(DATA_URL_MARKER) + DATA_URL_MARKER.length : 0
  assertAlphabet(data, BASE64_ALLOWED, 'Base64', base)
  const mime = parsed?.mime ?? 'application/octet-stream'
  return { bytes: base64ToBytes(data), mime, extension: extensionForMime(mime) }
}
