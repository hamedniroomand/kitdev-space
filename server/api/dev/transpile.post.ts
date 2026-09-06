import type { TranspileLoader } from '#server/utils/dev/transpile'
import { transpileSource } from '#server/utils/dev/transpile'
import { getClientKey } from '#server/utils/network/client-ip'
import { enforceRateLimit } from '#server/utils/network/rate-limit'

interface TranspileBody {
  input?: string
  loader?: TranspileLoader
}

const loaders = new Set<TranspileLoader>(['ts', 'tsx', 'js', 'jsx'])

export default defineEventHandler(async (event) => {
  const ip = getClientKey(event)
  enforceRateLimit(ip, 'dev:transpile')

  const body = await readBody<TranspileBody>(event)
  const loader = body.loader ?? 'ts'

  if (!loaders.has(loader)) {
    throw createError({
      statusCode: 400,
      message: 'Choose a valid loader: ts, tsx, js, or jsx.'
    })
  }

  try {
    const result = transpileSource(body.input ?? '', loader)
    return { result: result.code }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'The transpile operation failed.'
    throw createError({
      statusCode: 400,
      message
    })
  }
})
