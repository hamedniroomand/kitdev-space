import process from 'node:process'
import { getClientKey } from '#server/utils/network/client-ip'
import { enforceRateLimit } from '#server/utils/network/rate-limit'
import { resolveEnvelopeTarget } from '#server/utils/sentry/tunnel'

/**
 * Forwards Sentry envelopes from the browser to the ingest host.
 *
 * The browser SDK posts to this same-origin path, so an ad blocker that stops
 * requests to sentry.io does not stop error reports. The route accepts only
 * envelopes for this site's DSN, keeps a rate limit, and never reads or
 * changes the payload.
 */
export default defineEventHandler(async (event) => {
  const dsn = process.env.NUXT_PUBLIC_SENTRY_DSN
  if (!dsn) {
    throw createError({ statusCode: 404, message: 'Not found.' })
  }

  enforceRateLimit(getClientKey(event), 'sentry:tunnel', 60)

  const raw = await readRawBody(event, false)
  const bytes = raw == null ? new Uint8Array() : (typeof raw === 'string' ? new TextEncoder().encode(raw) : new Uint8Array(raw))
  const target = resolveEnvelopeTarget(bytes, dsn)
  if (!target) {
    throw createError({ statusCode: 400, message: 'The envelope is not for this project.' })
  }

  const response = await fetch(target.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-sentry-envelope' },
    body: bytes,
    signal: AbortSignal.timeout(5000),
  }).catch(() => null)

  setResponseStatus(event, response?.ok ? 200 : 502)
  return ''
})
