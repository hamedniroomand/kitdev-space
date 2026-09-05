import { Buffer } from 'node:buffer'
import { Resvg } from '@resvg/resvg-js'
import { ImageError } from './errors'
import { MAX_PIXELS } from './limits'

const SVG_HEAD = /^\s*(?:<\?xml\b[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg\b/i

/** href / xlink:href / src with http(s) or protocol-relative // */
const REMOTE_ATTR
  = /\b(?:href|xlink:href)\s*=\s*(['"]?)(?:https?:|\/\/)/i

/** url(http…) or url(//…) in CSS */
const REMOTE_URL = /url\(\s*(['"]?)\s*(?:https?:|\/\/)/i

const EXTERNAL_MESSAGE
  = 'This SVG uses an external resource.\n\nRemove remote links, fonts, and images, then try again.'

function resvgFontOpts() {
  return { loadSystemFonts: false as const }
}

function fitInside(srcW: number, srcH: number, maxW: number, maxH: number): { mode: 'zoom', value: number } {
  const zoom = Math.min(maxW / srcW, maxH / srcH)
  return { mode: 'zoom', value: zoom }
}

export function isSvgBytes(input: Uint8Array): boolean {
  if (input.byteLength === 0) {
    return false
  }
  const head = new TextDecoder().decode(input.subarray(0, 1024))
  return SVG_HEAD.test(head)
}

export function assertNoExternalSvgResources(input: Uint8Array): void {
  const text = new TextDecoder().decode(input)
  if (REMOTE_ATTR.test(text) || REMOTE_URL.test(text)) {
    throw new ImageError(EXTERNAL_MESSAGE)
  }
}

export function rasterizeSvg(
  input: Uint8Array,
  opts?: { width?: number, height?: number }
): Uint8Array {
  assertNoExternalSvgResources(input)

  try {
    const buf = Buffer.from(input.buffer, input.byteOffset, input.byteLength)
    const base = new Resvg(buf, { font: resvgFontOpts() })
    const srcW = base.width
    const srcH = base.height
    if (!(srcW > 0 && srcH > 0)) {
      throw new ImageError(
        'The SVG could not be read.\n\nCheck the file and try again.'
      )
    }

    let fitTo: { mode: 'original' } | { mode: 'zoom', value: number } = { mode: 'original' }

    if (opts?.width != null && opts?.height != null) {
      fitTo = fitInside(srcW, srcH, opts.width, opts.height)
    } else if (srcW * srcH > MAX_PIXELS) {
      const zoom = Math.sqrt(MAX_PIXELS / (srcW * srcH))
      fitTo = { mode: 'zoom', value: zoom }
    }

    const renderer
      = fitTo.mode === 'original'
        ? base
        : new Resvg(buf, { font: resvgFontOpts(), fitTo })

    const pngData = renderer.render()
    if (pngData.width * pngData.height > MAX_PIXELS) {
      throw new ImageError(
        'The image is too large.\n\nUse a smaller SVG or lower dimensions.'
      )
    }

    return new Uint8Array(pngData.asPng())
  } catch (cause) {
    if (cause instanceof ImageError) {
      throw cause
    }
    throw new ImageError(
      'The SVG could not be read.\n\nCheck the file and try again.',
      { cause }
    )
  }
}
