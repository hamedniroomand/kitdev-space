import { decodeBase64, encodeBase64 } from '#shared/utils/crypto/base64'
import { decodeHex, encodeHex } from '#shared/utils/crypto/hex'
import { htmlEntityDecode, htmlEntityEncode, urlDecode, urlEncode } from './html-url'
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

export interface CodecOption {
  label: string
  value: CodecFormat
  hint: string
}

export const CODEC_OPTIONS: CodecOption[] = [
  { label: 'Base64', value: 'base64', hint: 'Standard Base64 with padding.' },
  { label: 'Base64 URL', value: 'base64url', hint: 'URL-safe Base64 with no padding. Used by JWT.' },
  { label: 'Hex', value: 'hex', hint: 'Two hex digits for each byte.' },
  { label: 'URL', value: 'url', hint: 'Percent encoding for a query value.' },
  { label: 'HTML entities', value: 'html', hint: 'Makes text safe inside HTML.' },
  { label: 'JSON string', value: 'json', hint: 'Escapes for a JSON string value.' },
  { label: 'JavaScript string', value: 'javascript', hint: 'Escapes quotes, newlines, and tabs.' },
  { label: 'SQL string', value: 'sql', hint: 'Doubles a single quote.' },
  { label: 'Shell argument', value: 'shell', hint: 'Quotes text for a shell command.' },
]

function toBase64Url(value: string): string {
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): string {
  const padded = value.trim().replace(/-/g, '+').replace(/_/g, '/')
  return padded + '='.repeat((4 - (padded.length % 4)) % 4)
}

export function encodeWith(text: string, format: CodecFormat): string {
  switch (format) {
    case 'base64':
      return encodeBase64(text)
    case 'base64url':
      return toBase64Url(encodeBase64(text))
    case 'hex':
      return encodeHex(text)
    case 'url':
      return urlEncode(text)
    case 'html':
      return htmlEntityEncode(text)
    default:
      return escapeString(text, format)
  }
}

export function decodeWith(text: string, format: CodecFormat): string {
  switch (format) {
    case 'base64':
      return decodeBase64(text)
    case 'base64url':
      return decodeBase64(fromBase64Url(text))
    case 'hex':
      return decodeHex(text)
    case 'url':
      return urlDecode(text)
    case 'html':
      return htmlEntityDecode(text)
    default:
      return unescapeString(text, format)
  }
}
