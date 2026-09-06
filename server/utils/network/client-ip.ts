import type { H3Event } from 'h3'
import process from 'node:process'
import { getHeader, getRequestIP } from 'h3'

/**
 * Headers that only the platform edge can set.
 *
 * Vercel overwrites `x-forwarded-for` at the edge and does not forward
 * external values, so on Vercel these headers hold the real client IP.
 * `x-vercel-forwarded-for` stays correct even with a proxy above Vercel.
 */
const EDGE_IP_HEADERS = ['x-vercel-forwarded-for', 'x-real-ip']

/**
 * `true` when the platform edge sanitizes forwarded headers.
 * Set `TRUST_PROXY_HEADERS=1` for another edge that does the same.
 */
function edgeIsTrusted(): boolean {
  return Boolean(process.env.VERCEL) || process.env.TRUST_PROXY_HEADERS === '1'
}

function firstAddress(value: string): string | undefined {
  const first = value.split(',')[0]?.trim()
  return first || undefined
}

function lastAddress(value: string): string | undefined {
  const parts = value.split(',').map(part => part.trim()).filter(Boolean)
  return parts.at(-1)
}

/**
 * The rate-limit key for the caller.
 *
 * `getRequestIP(event, { xForwardedFor: true })` reads the leftmost
 * `x-forwarded-for` entry, which a client can set freely. Without a trusted
 * edge that lets a caller defeat every rate limit with one header. This
 * function reads an edge header first, then the closest proxy hop, and only
 * uses the socket address as a last resort.
 */
export function getClientKey(event: H3Event): string {
  if (edgeIsTrusted()) {
    for (const name of EDGE_IP_HEADERS) {
      const value = getHeader(event, name)
      const address = value ? firstAddress(value) : undefined
      if (address) {
        return address
      }
    }

    const forwarded = getHeader(event, 'x-forwarded-for')
    const address = forwarded ? firstAddress(forwarded) : undefined
    if (address) {
      return address
    }
  }
  else {
    // No trusted edge. The rightmost entry is the hop that reached this
    // server, so a client cannot append a value after it.
    const forwarded = getHeader(event, 'x-forwarded-for')
    const address = forwarded ? lastAddress(forwarded) : undefined
    if (address) {
      return address
    }
  }

  return getRequestIP(event) ?? 'anonymous'
}
