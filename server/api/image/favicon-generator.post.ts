import { ImageError } from '#server/utils/image/errors'
import { generateFaviconPackage } from '#server/utils/image/favicon'
import { readImageForm } from '#server/utils/image/read-upload'
import { getClientKey } from '#server/utils/network/client-ip'
import { enforceRateLimit } from '#server/utils/network/rate-limit'

export default defineEventHandler(async (event) => {
  const ip = getClientKey(event)
  enforceRateLimit(ip, 'image:favicon')

  try {
    const { bytes, fields } = await readImageForm(event)
    const appName = fields.appName?.trim() || undefined
    const shortName = fields.shortName?.trim() || undefined
    const themeColor = fields.themeColor?.trim() || undefined
    const backgroundColor = fields.backgroundColor?.trim() || undefined

    const result = await generateFaviconPackage(bytes, {
      appName,
      shortName,
      themeColor,
      backgroundColor,
    })

    return { result }
  }
  catch (cause) {
    const message = cause instanceof ImageError
      ? cause.message
      : 'The favicon generation failed.'
    throw createError({
      statusCode: 400,
      message,
    })
  }
})
