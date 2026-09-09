import type { SpfResolvers } from '#server/utils/network/spf'
import { describe, expect, it } from 'bun:test'
import { traceSpf } from '#server/utils/network/spf'

type Fixture = Record<string, string[]>

function resolvers(fixture: {
  txt?: Fixture
  a?: Fixture
  aaaa?: Fixture
  mx?: Fixture
  fail?: string[]
}): SpfResolvers {
  function read(map: Fixture | undefined, name: string): Promise<string[]> {
    if (fixture.fail?.includes(name)) {
      return Promise.reject(new Error('The lookup failed.'))
    }
    return Promise.resolve(map?.[name] ?? [])
  }

  return {
    txt: name => read(fixture.txt, name),
    a: name => read(fixture.a, name),
    aaaa: name => read(fixture.aaaa, name),
    mx: name => read(fixture.mx, name),
  }
}

describe('traceSpf', () => {
  it('follows include and redirect and flattens the addresses', async () => {
    const trace = await traceSpf('example.com', {
      resolvers: resolvers({
        txt: {
          'example.com': ['v=spf1 include:one.example.net redirect=two.example.net'],
          'one.example.net': ['v=spf1 ip4:203.0.113.0/24 a:mail.example.net -all'],
          'two.example.net': ['v=spf1 ip6:2001:db8::/32 mx -all'],
        },
        a: { 'mail.example.net': ['198.51.100.7'], 'mx1.example.net': ['198.51.100.8'] },
        aaaa: { 'mail.example.net': ['2001:db8::1'] },
        mx: { 'two.example.net': ['mx1.example.net'] },
      }),
    })

    expect(trace.nodes.map(node => node.domain)).toEqual([
      'example.com',
      'one.example.net',
      'two.example.net',
    ])
    expect(trace.nodes[1]?.via).toBe('include')
    expect(trace.nodes[2]?.via).toBe('redirect')
    expect(trace.ipv4).toEqual(['198.51.100.7', '198.51.100.8', '203.0.113.0/24'])
    expect(trace.ipv6).toEqual(['2001:db8::/32', '2001:db8::1'])
    // include, redirect, a, and mx each spend one lookup.
    expect(trace.lookupCount).toBe(4)
    expect(trace.exceeded).toBe(false)
  })

  it('stops at the RFC 7208 limit of 10 lookups', async () => {
    const txt: Fixture = { 'example.com': ['v=spf1 include:hop0.example.net -all'] }
    for (let index = 0; index < 20; index += 1) {
      txt[`hop${index}.example.net`] = [`v=spf1 include:hop${index + 1}.example.net -all`]
    }

    const trace = await traceSpf('example.com', { resolvers: resolvers({ txt }) })

    expect(trace.lookupCount).toBe(10)
    expect(trace.lookupLimit).toBe(10)
    expect(trace.exceeded).toBe(true)
    expect(trace.issues.map(item => item.code)).toContain('spf-lookup-limit')
    expect(trace.issues.find(item => item.code === 'spf-lookup-limit')?.level).toBe('error')
    // The walk must never pass the limit.
    expect(trace.nodes.length).toBeLessThanOrEqual(11)
  })

  it('counts void lookups and reports the RFC limit of 2', async () => {
    const trace = await traceSpf('example.com', {
      resolvers: resolvers({
        txt: {
          'example.com': ['v=spf1 include:a.example.net include:b.example.net include:c.example.net -all'],
        },
      }),
    })

    expect(trace.voidLookupCount).toBe(3)
    expect(trace.voidLookupLimit).toBe(2)
    expect(trace.issues.map(item => item.code)).toContain('spf-void-limit')
  })

  it('stops a loop and reports a failed query apart from a void answer', async () => {
    const trace = await traceSpf('example.com', {
      resolvers: resolvers({
        txt: {
          'example.com': ['v=spf1 include:loop.example.net include:down.example.net -all'],
          'loop.example.net': ['v=spf1 include:example.com -all'],
        },
        fail: ['down.example.net'],
      }),
    })

    expect(trace.loops).toEqual(['example.com'])
    expect(trace.failed).toEqual(['down.example.net'])
    expect(trace.voidLookupCount).toBe(0)
    expect(trace.issues.map(item => item.code)).toContain('spf-trace-loop')
    expect(trace.issues.map(item => item.code)).toContain('spf-trace-failed')
  })

  it('uses the records that the caller already read for the root domain', async () => {
    const trace = await traceSpf('example.com', {
      rootRecords: ['v=spf1 ip4:203.0.113.1 -all'],
      resolvers: resolvers({}),
    })

    expect(trace.nodes[0]?.record).toBe('v=spf1 ip4:203.0.113.1 -all')
    expect(trace.lookupCount).toBe(0)
    expect(trace.ipv4).toEqual(['203.0.113.1'])
  })
})
