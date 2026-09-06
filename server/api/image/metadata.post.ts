import type { ImageEncodeFormat } from '#shared/utils/image/types'
import { ImageError } from '#server/utils/image/errors'
import { getImageMetadata, stripMetadata } from '#server/utils/image/pipeline'
import { readImageForm } from '#server/utils/image/read-upload'
import { getClientKey } from '#server/utils/network/client-ip'
import { enforceRateLimit } from '#server/utils/network/rate-limit'

const formats = new Set<ImageEncodeFormat>(['webp', 'avif', 'jpeg', 'png'])

function isEncodeFormat(value: string): value is ImageEncodeFormat {
  return formats.has(value as ImageEncodeFormat)
}

export default defineEventHandler(async (event) => {
  const ip = getClientKey(event)
  enforceRateLimit(ip, 'image:metadata')

  try {
    const { bytes, fields } = await readImageForm(event)
    const strip = fields.strip === '1' || fields.strip === 'true'

    if (strip) {
      const format = fields.format ?? 'webp'
      const quality = fields.quality != null ? Number(fields.quality) : 80
      if (!isEncodeFormat(format)) {
        throw new ImageError('Choose a valid output format.')
      }
      const result = await stripMetadata(bytes, { format, quality })
      setHeader(event, 'Content-Type', result.mime)
      setHeader(event, 'X-Image-Width', String(result.width))
      setHeader(event, 'X-Image-Height', String(result.height))
      setHeader(event, 'X-Input-Bytes', String(bytes.byteLength))
      setHeader(event, 'X-Output-Bytes', String(result.bytes.byteLength))
      return result.bytes
    }

    const meta = await getImageMetadata(bytes)
    return {
      width: meta.width,
      height: meta.height,
      format: meta.format,
      bytes: bytes.byteLength
    }
  } catch (cause) {
    const message = cause instanceof ImageError
      ? cause.message
      : 'The metadata operation failed.'
    throw createError({
      statusCode: 400,
      message
    })
  }
})
