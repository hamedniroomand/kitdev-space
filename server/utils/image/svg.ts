import { ImageError } from './errors'

const SVG_HEAD = /^\s*(?:<\?xml\b[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg\b/i

/** href / xlink:href / src with http(s) or protocol-relative // */
const REMOTE_ATTR
  = /(?:(?:xlink:)?href|src)\s*=\s*(["'])\s*(?:https?:|\/\/)/i

/** url(http…) or url(//…) in CSS */
const REMOTE_URL = /url\(\s*(['"]?)\s*(?:https?:|\/\/)/i

const EXTERNAL_MESSAGE
  = 'This SVG uses an external resource.\n\nRemove remote links, fonts, and images, then try again.'

export function isSvgBytes(input: Uint8Array): boolean {
  if (input.byteLength === 0) {
    return false
  }
  const head = new TextDecoder().decode(input.subarray(0, Math.min(input.byteLength, 8192)))
  return SVG_HEAD.test(head)
}

export function assertNoExternalSvgResources(input: Uint8Array): void {
  const text = new TextDecoder().decode(input)
  if (REMOTE_ATTR.test(text) || REMOTE_URL.test(text)) {
    throw new ImageError(EXTERNAL_MESSAGE)
  }
}
