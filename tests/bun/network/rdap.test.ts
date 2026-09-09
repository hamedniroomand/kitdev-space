import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { lookupRdap } from '#server/utils/network/rdap'

const BOOTSTRAP_URL = 'https://data.iana.org/rdap/dns.json'
const COM_BASE = 'https://rdap.verisign.com/com/v1/'
// The referral host is an IP address, so the SSRF check needs no DNS lookup and
// the test makes no network call.
const REGISTRAR_URL = 'https://8.8.8.8/rdap/domain/example.com'
const SECOND_REGISTRAR_URL = 'https://8.8.4.4/rdap/domain/example.com'

const bootstrap = {
  services: [[['com', 'net'], [COM_BASE]]],
}

const registrarPayload = {
  objectClassName: 'domain',
  entities: [
    {
      roles: ['registrar'],
      publicIds: [{ type: 'IANA Registrar ID', identifier: '292' }],
      vcardArray: [
        'vcard',
        [
          ['fn', {}, 'text', 'Example Registrar LLC'],
          ['email', {}, 'text', 'abuse@registrar.example'],
        ],
      ],
    },
  ],
}

function thinPayload(relatedHref: string) {
  return {
    objectClassName: 'domain',
    ldhName: 'EXAMPLE.COM',
    status: ['client transfer prohibited'],
    events: [{ eventAction: 'expiration', eventDate: '2030-01-01T00:00:00Z' }],
    entities: [
      {
        roles: ['registrar'],
        vcardArray: ['vcard', [['fn', {}, 'text', 'REDACTED FOR PRIVACY']]],
      },
    ],
    links: [
      { rel: 'self', href: `${COM_BASE}domain/example.com`, type: 'application/rdap+json' },
      { rel: 'related', href: relatedHref, type: 'application/rdap+json' },
    ],
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/rdap+json' },
  })
}

function timeoutError(): Error {
  const error = new Error('The operation timed out.')
  error.name = 'TimeoutError'
  return error
}

const realFetch = globalThis.fetch
let calls: string[] = []

/** Answers the IANA table always, and the RDAP queries from `routes`. */
function mockFetch(routes: Record<string, () => Promise<Response>>) {
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    calls.push(url)
    if (url === BOOTSTRAP_URL) {
      return json(bootstrap)
    }
    const route = routes[url]
    if (!route) {
      return json({ message: 'not found' }, 404)
    }
    return route()
  }) as typeof fetch
}

beforeEach(() => {
  calls = []
})

afterEach(() => {
  globalThis.fetch = realFetch
})

describe('lookupRdap', () => {
  it('queries the server of the IANA table and reports it', async () => {
    mockFetch({
      [`${COM_BASE}domain/example.com`]: async () => json({
        ...registrarPayload,
        events: [{ eventAction: 'expiration', eventDate: '2030-01-01T00:00:00Z' }],
      }),
    })

    const result = await lookupRdap('https://Example.com/path')

    expect(result.found).toBe(true)
    expect(result.query).toBe('example.com')
    expect(result.server).toBe(`${COM_BASE}domain/example.com`)
    expect(new Date(result.queriedAt!).getTime()).toBeGreaterThan(0)
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
    expect(result.daysUntilExpiration).toBeGreaterThan(0)
    expect(result.registrar?.abuseEmail).toBe('abuse@registrar.example')
    // The registry answer is complete, so the lookup follows no referral.
    expect(result.referrals).toBeUndefined()
  })

  it('reports an available domain for a 404 answer', async () => {
    mockFetch({})

    const result = await lookupRdap('example.com')

    expect(result.found).toBe(false)
    expect(result.status).toEqual(['available'])
    expect(result.server).toBe(`${COM_BASE}domain/example.com`)
  })

  it('sends the query a second time after a timeout', async () => {
    let attempt = 0
    mockFetch({
      [`${COM_BASE}domain/example.com`]: async () => {
        attempt++
        if (attempt === 1) {
          throw timeoutError()
        }
        return json(registrarPayload)
      },
    })

    const result = await lookupRdap('example.com')

    expect(attempt).toBe(2)
    expect(result.found).toBe(true)
  })

  it('explains a timeout after both attempts fail', async () => {
    let attempt = 0
    mockFetch({
      [`${COM_BASE}domain/example.com`]: async () => {
        attempt++
        throw timeoutError()
      },
    })

    await expect(lookupRdap('example.com')).rejects.toThrow(/timed out/)
    expect(attempt).toBe(2)
  })

  it('sends an IP address to the rdap.org redirector', async () => {
    mockFetch({
      'https://rdap.org/ip/1.1.1.1': async () => json({
        objectClassName: 'ip network',
        status: ['active'],
      }),
    })

    const result = await lookupRdap('1.1.1.1')

    expect(result.type).toBe('ip')
    expect(result.server).toBe('https://rdap.org/ip/1.1.1.1')
    expect(calls).not.toContain(BOOTSTRAP_URL)
  })

  it('follows the registrar link of a thin registry answer', async () => {
    mockFetch({
      [`${COM_BASE}domain/example.com`]: async () => json(thinPayload(REGISTRAR_URL)),
      [REGISTRAR_URL]: async () => json(registrarPayload),
    })

    const result = await lookupRdap('example.com')

    // The registry hides the name. The registrar answer fills it.
    expect(result.registrar?.name).toBe('Example Registrar LLC')
    expect(result.registrar?.abuseEmail).toBe('abuse@registrar.example')
    expect(result.redactedFields).toContain('Name')
    expect(result.referrals).toEqual([REGISTRAR_URL])
    // The registry answer stays the raw record.
    expect((result.raw as { links?: unknown[] }).links).toHaveLength(2)
    expect(result.status).toEqual(['client transfer prohibited'])
  })

  it('stops the referral chain after two hops', async () => {
    mockFetch({
      [`${COM_BASE}domain/example.com`]: async () => json(thinPayload(REGISTRAR_URL)),
      [REGISTRAR_URL]: async () => json(thinPayload(SECOND_REGISTRAR_URL)),
      [SECOND_REGISTRAR_URL]: async () => json(thinPayload(`${COM_BASE}domain/example.com`)),
    })

    const result = await lookupRdap('example.com')

    expect(result.referrals).toEqual([REGISTRAR_URL, SECOND_REGISTRAR_URL])
    // One registry query and two referral queries. The third link stays unread.
    expect(calls.filter(url => url !== BOOTSTRAP_URL)).toHaveLength(3)
  })
})
