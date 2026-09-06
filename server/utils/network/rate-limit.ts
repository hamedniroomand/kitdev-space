import { createError } from 'h3'

const WINDOW_MS = 60_000
const MAX_REQUESTS = 20

/**
 * Ceiling on tracked keys. Each key holds at most `MAX_REQUESTS` timestamps,
 * so the map stays small. Without a ceiling a caller that varies its address
 * grows the map until the process runs out of memory.
 */
const MAX_KEYS = 10_000

// ponytail: In-memory counts stay in one process. A later phase can use shared storage.
const hits = new Map<string, number[]>()

/** Drop keys whose newest timestamp is outside the window. */
function sweep(now: number): void {
  for (const [id, stamps] of hits) {
    const newest = stamps.at(-1)
    if (newest === undefined || now - newest >= WINDOW_MS) {
      hits.delete(id)
    }
  }
}

export function enforceRateLimit(ip: string, key: string, maxRequests = MAX_REQUESTS): void {
  const id = `${ip}\0${key}`
  const now = Date.now()

  if (hits.size >= MAX_KEYS) {
    sweep(now)
    // Still full after a sweep: every tracked key is active. Drop the oldest
    // insertion to keep the map bounded.
    if (hits.size >= MAX_KEYS) {
      const oldest = hits.keys().next().value
      if (oldest !== undefined) {
        hits.delete(oldest)
      }
    }
  }

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
