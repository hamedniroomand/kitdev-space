import { cleanImageMetadata } from '#server/utils/image/clean'
import { ImageError } from '#server/utils/image/errors'
import { readImageForm } from '#server/utils/image/read-upload'
import { getClientKey } from '#server/utils/network/client-ip'
import { enforceRateLimit } from '#server/utils/network/rate-limit'

/** Removes every metadata block from an image with a re-encode. The file is processed in memory and is not stored. */
export default defineEventHandler(async (event) => {
  const ip = getClientKey(event)
  enforceRateLimit(ip, 'image:clean')

  try {
    const { bytes } = await readImageForm(event)
    const result = await cleanImageMetadata(bytes)

    setHeader(event, 'Content-Type', result.mime)
    setHeader(event, 'X-Image-Width', String(result.width))
    setHeader(event, 'X-Image-Height', String(result.height))
    setHeader(event, 'X-Input-Bytes', String(bytes.byteLength))
    setHeader(event, 'X-Output-Bytes', String(result.bytes.byteLength))
    return result.bytes
  }
  catch (cause) {
    const message = cause instanceof ImageError
      ? cause.message
      : 'The image could not be cleaned.'
    throw createError({
      statusCode: 400,
      message,
    })
  }
})
