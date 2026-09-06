import { afterEach, describe, expect, it } from 'bun:test'
import { getClientKey } from '#server/utils/network/client-ip'

interface FakeEvent {
  node: { req: { headers: Record<string, string>, socket: { remoteAddress?: string } } }
  context: Record<string, unknown>
}

function eventWith(headers: Record<string, string>, remoteAddress = '198.51.100.7'): FakeEvent {
  return {
    node: { req: { headers, socket: { remoteAddress } } },
    context: {},
  }
}

const originalVercel = process.env.VERCEL
const originalTrust = process.env.TRUST_PROXY_HEADERS

afterEach(() => {
  if (originalVercel === undefined) {
    delete process.env.VERCEL
  }
  else {
    process.env.VERCEL = originalVercel
  }
  if (originalTrust === undefined) {
    delete process.env.TRUST_PROXY_HEADERS
  }
  else {
    process.env.TRUST_PROXY_HEADERS = originalTrust
  }
})

describe('getClientKey without a trusted edge', () => {
  it('ignores a spoofed leftmost x-forwarded-for entry', () => {
    delete process.env.VERCEL
    delete process.env.TRUST_PROXY_HEADERS

    // A caller sends the first value. The last value is the hop that reached
    // this server, so the key must not follow the caller.
    const event = eventWith({ 'x-forwarded-for': '1.2.3.4, 203.0.113.9' })

    expect(getClientKey(event as never)).toBe('203.0.113.9')
  })

  it('gives one key for many spoofed values from one caller', () => {
    delete process.env.VERCEL
    delete process.env.TRUST_PROXY_HEADERS

    const first = getClientKey(eventWith({ 'x-forwarded-for': 'a, 203.0.113.9' }) as never)
    const second = getClientKey(eventWith({ 'x-forwarded-for': 'b, 203.0.113.9' }) as never)

    expect(first).toBe(second)
  })

  it('falls back to the socket address', () => {
    delete process.env.VERCEL
    delete process.env.TRUST_PROXY_HEADERS

    expect(getClientKey(eventWith({}) as never)).toBe('198.51.100.7')
  })

  it('ignores x-vercel-forwarded-for off Vercel', () => {
    delete process.env.VERCEL
    delete process.env.TRUST_PROXY_HEADERS

    const event = eventWith({ 'x-vercel-forwarded-for': '1.2.3.4' })

    expect(getClientKey(event as never)).toBe('198.51.100.7')
  })
})

describe('getClientKey behind a trusted edge', () => {
  it('prefers the edge header', () => {
    process.env.VERCEL = '1'

    const event = eventWith({
      'x-vercel-forwarded-for': '203.0.113.5',
      'x-forwarded-for': '1.2.3.4',
    })

    expect(getClientKey(event as never)).toBe('203.0.113.5')
  })

  it('uses x-forwarded-for when no edge header is present', () => {
    process.env.VERCEL = '1'

    // Vercel overwrites x-forwarded-for at the edge, so the value is the
    // real client address.
    expect(getClientKey(eventWith({ 'x-forwarded-for': '203.0.113.5' }) as never)).toBe('203.0.113.5')
  })
})
