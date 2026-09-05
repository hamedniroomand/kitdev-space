import { createError } from 'h3'

const WINDOW_MS = 60_000
const MAX_REQUESTS = 20

// ponytail: In-memory counts stay in one process. A later phase can use shared storage.
const hits = new Map<string, number[]>()

export function enforceRateLimit(ip: string, key: string, maxRequests = MAX_REQUESTS): void {
  const id = `${ip}\0${key}`
  const now = Date.now()
  const recent = (hits.get(id) ?? []).filter(stamp => now - stamp < WINDOW_MS)
  const limit = maxRequests > 0 ? maxRequests : MAX_REQUESTS

  if (recent.length >= limit) {
    hits.set(id, recent)
    throw createError({
      statusCode: 429,
      message: 'Too many requests. Try again later.'
    })
  }

  recent.push(now)
  hits.set(id, recent)
}
