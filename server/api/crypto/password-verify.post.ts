import { verifyPasswordHash } from '#server/utils/crypto/password'
import { getClientKey } from '#server/utils/network/client-ip'
import { enforceRateLimit } from '#server/utils/network/rate-limit'

interface VerifyBody {
  password?: string
  hash?: string
}

export default defineEventHandler(async (event) => {
  const ip = getClientKey(event)
  enforceRateLimit(ip, 'crypto:password', 5)

  const body = await readBody<VerifyBody>(event)

  try {
    const matched = await verifyPasswordHash({
      password: body.password ?? '',
      hash: body.hash ?? '',
    })

    return { result: { matched } }
  }
  catch (cause) {
    const message = cause instanceof Error ? cause.message : 'The verify operation failed.'
    throw createError({
      statusCode: 400,
      message,
    })
  }
})
