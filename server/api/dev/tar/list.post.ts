import { listTarEntries } from '#server/utils/dev/archive'
import { readImageForm } from '#server/utils/image/read-upload'
import { enforceRateLimit } from '#server/utils/network/rate-limit'

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'anonymous'
  enforceRateLimit(ip, 'dev:tar-list')

  try {
    const { bytes } = await readImageForm(event)
    const entries = await listTarEntries(bytes)
    return {
      result: {
        entries,
        bytes: bytes.byteLength
      }
    }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'The archive list failed.'
    throw createError({
      statusCode: 400,
      message
    })
  }
})
