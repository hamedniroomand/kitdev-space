import type { PasswordAlgorithm } from '#server/utils/crypto/password'
import { benchmarkPassword } from '#server/utils/crypto/password'
import { getClientKey } from '#server/utils/network/client-ip'
import { enforceRateLimit } from '#server/utils/network/rate-limit'

interface PasswordBody {
  password?: string
  algorithm?: PasswordAlgorithm
  memoryCost?: number
  timeCost?: number
  cost?: number
  verify?: boolean
}

const algorithms = new Set<PasswordAlgorithm>(['argon2id', 'bcrypt'])

export default defineEventHandler(async (event) => {
  const ip = getClientKey(event)
  enforceRateLimit(ip, 'crypto:password', 5)

  const body = await readBody<PasswordBody>(event)
  const algorithm = body.algorithm

  if (!algorithm || !algorithms.has(algorithm)) {
    throw createError({
      statusCode: 400,
      message: 'Choose argon2id or bcrypt.'
    })
  }

  try {
    const result = await benchmarkPassword({
      password: body.password ?? '',
      algorithm,
      memoryCost: body.memoryCost,
      timeCost: body.timeCost,
      cost: body.cost,
      verify: body.verify ?? true
    })

    return { result }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'The password benchmark failed.'
    throw createError({
      statusCode: 400,
      message
    })
  }
})
