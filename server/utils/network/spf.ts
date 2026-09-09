import type { SpfTrace, SpfTraceNode, SpfTraceVia } from '#shared/utils/network/email-health'
import {
  buildSpfTraceIssues,
  findSpfRecords,
  parseSpfMechanisms,
  SPF_LOOKUP_LIMIT,
  SPF_VOID_LOOKUP_LIMIT,
} from '#shared/utils/network/email-health'
import { lookupDns } from './dns'

export interface SpfResolvers {
  txt: (name: string) => Promise<string[]>
  a: (name: string) => Promise<string[]>
  aaaa: (name: string) => Promise<string[]>
  mx: (name: string) => Promise<string[]>
}

export interface TraceSpfOptions {
  resolvers?: SpfResolvers
  /** The TXT records of the domain, when the caller already read them. */
  rootRecords?: string[]
}

/** The number of MX hosts whose addresses the trace reads. RFC 7208 permits 10. */
const MAX_MX_HOSTS = 10

function dnsResolvers(): SpfResolvers {
  return {
    txt: name => lookupDns(name, 'TXT') as Promise<string[]>,
    a: name => lookupDns(name, 'A') as Promise<string[]>,
    aaaa: name => lookupDns(name, 'AAAA') as Promise<string[]>,
    mx: async (name) => {
      const records = await lookupDns(name, 'MX') as { exchange: string }[]
      return records.map(record => record.exchange)
    },
  }
}

function withoutMask(value: string | undefined): string {
  return (value ?? '').split('/')[0] ?? ''
}

/**
 * Walks the SPF tree of a domain and flattens the authorized addresses.
 * The walk stops at the RFC 7208 limit of 10 DNS lookups, so it never runs
 * without a bound.
 */
export async function traceSpf(domain: string, options: TraceSpfOptions = {}): Promise<SpfTrace> {
  const resolvers = options.resolvers ?? dnsResolvers()

  let lookupCount = 0
  let voidLookupCount = 0
  let exceeded = false
  const loops: string[] = []
  const failed: string[] = []
  const nodes: SpfTraceNode[] = []
  const ipv4 = new Set<string>()
  const ipv6 = new Set<string>()
  const seen = new Set<string>()

  function spend(): boolean {
    if (lookupCount >= SPF_LOOKUP_LIMIT) {
      exceeded = true
      return false
    }
    lookupCount += 1
    return true
  }

  /** Runs one query. A void answer and an error stay apart, as RFC 7208 states. */
  async function query(
    resolve: (name: string) => Promise<string[]>,
    name: string,
    countVoid = true,
  ): Promise<string[] | null> {
    try {
      const records = await resolve(name)
      if (countVoid && records.length === 0) {
        voidLookupCount += 1
      }
      return records
    }
    catch {
      failed.push(name)
      return null
    }
  }

  async function addresses(name: string) {
    for (const address of await query(resolvers.a, name, false) ?? []) {
      ipv4.add(address)
    }
    for (const address of await query(resolvers.aaaa, name, false) ?? []) {
      ipv6.add(address)
    }
  }

  async function walk(name: string, via: SpfTraceVia, depth: number): Promise<void> {
    const key = name.toLowerCase()
    if (seen.has(key)) {
      loops.push(key)
      return
    }
    seen.add(key)

    const records = depth === 0 && options.rootRecords
      ? options.rootRecords
      : await query(resolvers.txt, name)

    if (records === null) {
      nodes.push({ domain: name, via, depth, record: null, status: 'failed', mechanisms: [] })
      return
    }

    const record = findSpfRecords(records)[0] ?? null
    if (!record) {
      nodes.push({ domain: name, via, depth, record: null, status: 'missing', mechanisms: [] })
      return
    }

    const mechanisms = parseSpfMechanisms(record)
    nodes.push({ domain: name, via, depth, record, status: 'ok', mechanisms })

    for (const mechanism of mechanisms) {
      if (exceeded) {
        break
      }

      const target = withoutMask(mechanism.value) || name

      switch (mechanism.type) {
        case 'ip4':
          if (mechanism.value) {
            ipv4.add(mechanism.value)
          }
          break
        case 'ip6':
          if (mechanism.value) {
            ipv6.add(mechanism.value)
          }
          break
        case 'a':
          if (!spend()) {
            break
          }
          await addresses(target)
          break
        case 'mx': {
          if (!spend()) {
            break
          }
          const hosts = await query(resolvers.mx, target)
          for (const host of (hosts ?? []).slice(0, MAX_MX_HOSTS)) {
            await addresses(host)
          }
          break
        }
        case 'exists':
          if (!spend()) {
            break
          }
          await query(resolvers.a, target)
          break
        case 'ptr':
          spend()
          break
        case 'include':
          if (!mechanism.value || !spend()) {
            break
          }
          await walk(mechanism.value, 'include', depth + 1)
          break
        case 'redirect':
          if (!mechanism.value || !spend()) {
            break
          }
          await walk(mechanism.value, 'redirect', depth + 1)
          break
      }
    }
  }

  await walk(domain, 'root', 0)

  const counters = { lookupCount, voidLookupCount, exceeded, loops, failed }

  return {
    ...counters,
    lookupLimit: SPF_LOOKUP_LIMIT,
    voidLookupLimit: SPF_VOID_LOOKUP_LIMIT,
    nodes,
    ipv4: [...ipv4].sort(),
    ipv6: [...ipv6].sort(),
    issues: buildSpfTraceIssues(counters),
  }
}
