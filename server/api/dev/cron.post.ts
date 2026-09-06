import { describeCron, nextCronRuns } from '#server/utils/dev/cron'
import { getClientKey } from '#server/utils/network/client-ip'
import { enforceRateLimit } from '#server/utils/network/rate-limit'

interface CronBody {
  expression?: string
  count?: number
  timeZone?: string
  from?: string
}

export default defineEventHandler(async (event) => {
  const ip = getClientKey(event)
  enforceRateLimit(ip, 'dev:cron')

  const body = await readBody<CronBody>(event)
  const expression = body.expression ?? ''
  const count = body.count ?? 5
  const timeZone = body.timeZone ?? 'UTC'
  const from = body.from ? new Date(body.from) : new Date()

  try {
    const description = describeCron(expression)
    const nextRuns = nextCronRuns(expression, count, from, timeZone)
    return {
      result: {
        description,
        nextRuns,
      },
    }
  }
  catch (cause) {
    const message = cause instanceof Error ? cause.message : 'The cron operation failed.'
    throw createError({
      statusCode: 400,
      message,
    })
  }
})
