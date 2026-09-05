import type { ImageEncodeFormat } from '../../../shared/utils/image/types'
import { ImageError } from '../../utils/image/errors'
import { transformImage } from '../../utils/image/pipeline'
import { readImageForm } from '../../utils/image/read-upload'
import { enforceRateLimit } from '../../utils/network/rate-limit'

const formats = new Set<ImageEncodeFormat>(['webp', 'avif', 'jpeg', 'png'])
const rotates = new Set([90, 180, 270])

function isEncodeFormat(value: string): value is ImageEncodeFormat {
  return formats.has(value as ImageEncodeFormat)
}

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'anonymous'
  enforceRateLimit(ip, 'image:transform')

  try {
    const { bytes, fields } = await readImageForm(event)
    const format = fields.format ?? 'webp'
    const quality = fields.quality != null ? Number(fields.quality) : 80
    const flip = fields.flip === '1' || fields.flip === 'true'
    const flop = fields.flop === '1' || fields.flop === 'true'
    const grayscale = fields.grayscale === '1' || fields.grayscale === 'true'

    let rotate: 90 | 180 | 270 | undefined
    if (fields.rotate) {
      const value = Number(fields.rotate)
      if (!rotates.has(value)) {
        throw new ImageError('Rotate must be 90, 180, or 270.')
      }
      rotate = value as 90 | 180 | 270
    }

    if (!isEncodeFormat(format)) {
      throw new ImageError('Choose a valid output format.')
    }

    const result = await transformImage(bytes, {
      rotate,
      flip,
      flop,
      grayscale,
      format,
      quality
    })

    setHeader(event, 'Content-Type', result.mime)
    setHeader(event, 'X-Image-Width', String(result.width))
    setHeader(event, 'X-Image-Height', String(result.height))
    setHeader(event, 'X-Input-Bytes', String(bytes.byteLength))
    setHeader(event, 'X-Output-Bytes', String(result.bytes.byteLength))
    return result.bytes
  } catch (cause) {
    const message = cause instanceof ImageError
      ? cause.message
      : 'The transform operation failed.'
    throw createError({
      statusCode: 400,
      message
    })
  }
})
