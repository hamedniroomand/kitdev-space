import type { ImageEncodeFormat, ImageFilter, ImageFit, ImagePresetId } from '#shared/utils/image/types'
import { ImageError } from '#server/utils/image/errors'
import { IMAGE_PRESETS } from '#server/utils/image/presets'
import { resizeImage } from '#server/utils/image/pipeline'
import { readImageForm } from '#server/utils/image/read-upload'
import { getClientKey } from '#server/utils/network/client-ip'
import { enforceRateLimit } from '#server/utils/network/rate-limit'

const formats = new Set<ImageEncodeFormat>(['webp', 'avif', 'jpeg', 'png'])
const fits = new Set<ImageFit>(['inside', 'fill'])
const filters = new Set<ImageFilter>(['lanczos3', 'mitchell', 'nearest', 'cubic', 'box'])

function isEncodeFormat(value: string): value is ImageEncodeFormat {
  return formats.has(value as ImageEncodeFormat)
}

function isFit(value: string): value is ImageFit {
  return fits.has(value as ImageFit)
}

function isFilter(value: string): value is ImageFilter {
  return filters.has(value as ImageFilter)
}

function isPresetId(value: string): value is ImagePresetId {
  return value in IMAGE_PRESETS
}

export default defineEventHandler(async (event) => {
  const ip = getClientKey(event)
  enforceRateLimit(ip, 'image:resize')

  try {
    const { bytes, fields } = await readImageForm(event)
    const format = fields.format ?? 'webp'
    const fit = fields.fit ?? 'inside'
    const filter = fields.filter ?? 'lanczos3'
    const quality = fields.quality != null ? Number(fields.quality) : 80
    const withoutEnlargement = fields.withoutEnlargement === '1' || fields.withoutEnlargement === 'true'

    if (!isEncodeFormat(format)) {
      throw new ImageError('Choose a valid output format.')
    }
    if (!isFit(fit)) {
      throw new ImageError('Choose a valid fit mode.')
    }
    if (!isFilter(filter)) {
      throw new ImageError('Choose a valid resize filter.')
    }

    let width: number
    let height: number

    if (fields.preset) {
      if (!isPresetId(fields.preset)) {
        throw new ImageError('Choose a valid size preset.')
      }
      width = IMAGE_PRESETS[fields.preset].width
      height = IMAGE_PRESETS[fields.preset].height
    } else {
      width = Number(fields.width)
      height = Number(fields.height)
    }

    const result = await resizeImage(bytes, {
      width,
      height,
      fit,
      filter,
      format,
      quality,
      withoutEnlargement
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
      : 'The resize operation failed.'
    throw createError({
      statusCode: 400,
      message
    })
  }
})
