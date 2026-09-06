import { ImageError } from '../../utils/image/errors'
import { generateFaviconPackage } from '../../utils/image/favicon'
import { readImageForm } from '../../utils/image/read-upload'
import { enforceRateLimit } from '../../utils/network/rate-limit'

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'anonymous'
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
      backgroundColor
    })

    return { result }
  } catch (cause) {
    const message = cause instanceof ImageError
      ? cause.message
      : 'The favicon generation failed.'
    throw createError({
      statusCode: 400,
      message
    })
  }
})
