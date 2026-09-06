import { ImageError } from '#server/utils/image/errors'
import { convertSvgAtScale } from '#server/utils/image/pipeline'
import { assertImageSize } from '#server/utils/image/read-upload'
import { getClientKey } from '#server/utils/network/client-ip'
import { enforceRateLimit } from '#server/utils/network/rate-limit'

const formats = new Set(['png', 'webp'] as const)
const scales = new Set([1, 2, 4])

type SvgFormat = 'png' | 'webp'

function isSvgFormat(value: string): value is SvgFormat {
  return formats.has(value as SvgFormat)
}

function fieldText(data: Buffer | string | undefined): string | undefined {
  if (data == null) {
    return undefined
  }
  return typeof data === 'string' ? data : new TextDecoder().decode(data)
}

export default defineEventHandler(async (event) => {
  const ip = getClientKey(event)
  enforceRateLimit(ip, 'image:svg-convert')

  try {
    const contentType = getHeader(event, 'content-type') ?? ''
    let bytes: Uint8Array | null = null
    let scale = 1
    let format: SvgFormat = 'png'
    let quality = 80

    if (contentType.includes('application/json')) {
      const body = await readBody<{ svg?: string, scale?: number, format?: string, quality?: number }>(event)
      if (!body?.svg?.trim()) {
        throw new ImageError('Paste SVG code or upload an SVG file.')
      }
      bytes = new TextEncoder().encode(body.svg)
      scale = Number(body.scale ?? 1)
      format = (body.format ?? 'png') as SvgFormat
      quality = body.quality != null ? Number(body.quality) : 80
    } else if (contentType.includes('multipart/form-data')) {
      const form = await readMultipartFormData(event)
      const fields: Record<string, string> = {}
      for (const part of form ?? []) {
        if (!part.name) {
          continue
        }
        if (part.name === 'file' && part.data) {
          bytes = new Uint8Array(part.data)
          continue
        }
        const text = fieldText(part.data)
        if (text != null) {
          fields[part.name] = text
        }
      }
      if (fields.svg?.trim()) {
        bytes = new TextEncoder().encode(fields.svg)
      }
      scale = Number(fields.scale ?? 1)
      format = (fields.format ?? 'png') as SvgFormat
      quality = fields.quality != null ? Number(fields.quality) : 80
    } else {
      throw new ImageError('Paste SVG code or upload an SVG file.')
    }

    if (!bytes || bytes.byteLength === 0) {
      throw new ImageError('Paste SVG code or upload an SVG file.')
    }
    assertImageSize(bytes.byteLength)

    if (!scales.has(scale)) {
      throw new ImageError('Choose a scale of 1, 2, or 4.')
    }
    if (!isSvgFormat(format)) {
      throw new ImageError('Choose PNG or WebP as the output format.')
    }

    const result = await convertSvgAtScale(bytes, { scale, format, quality })
    setHeader(event, 'Content-Type', result.mime)
    setHeader(event, 'X-Image-Width', String(result.width))
    setHeader(event, 'X-Image-Height', String(result.height))
    setHeader(event, 'X-Input-Bytes', String(bytes.byteLength))
    setHeader(event, 'X-Output-Bytes', String(result.bytes.byteLength))
    return result.bytes
  } catch (cause) {
    const message = cause instanceof ImageError
      ? cause.message
      : 'The SVG convert operation failed.'
    throw createError({
      statusCode: 400,
      message
    })
  }
})
