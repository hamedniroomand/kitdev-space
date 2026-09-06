import { BlockList, isIPv4, isIPv6 } from 'node:net'
import { createError } from 'h3'

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])
const BLOCKED_HOSTS = new Set([
  'localhost',
  'metadata',
  'metadata.google.internal',
  'metadata.goog',
  'instance-data',
  'kubernetes.default',
  'kubernetes.default.svc'
])

/** Ports for plain HTTP and HTTPS fetch tools. */
export const WEB_PORTS = [80, 443, 8080, 8443]

/** Ports that commonly serve TLS. The TLS Inspector uses this list. */
export const TLS_PORTS = [443, 465, 563, 636, 853, 989, 990, 993, 995, 8443, 9443]

const blocked = new BlockList()
// IPv4 ranges that must stay unreachable.
blocked.addSubnet('0.0.0.0', 8, 'ipv4') // "this host on this network"
blocked.addSubnet('10.0.0.0', 8, 'ipv4') // private
blocked.addSubnet('100.64.0.0', 10, 'ipv4') // carrier NAT
blocked.addSubnet('127.0.0.0', 8, 'ipv4') // loopback
blocked.addSubnet('169.254.0.0', 16, 'ipv4') // link-local and cloud metadata
blocked.addSubnet('172.16.0.0', 12, 'ipv4') // private
blocked.addSubnet('192.0.0.0', 24, 'ipv4') // IETF protocol assignments
blocked.addSubnet('192.0.2.0', 24, 'ipv4') // documentation
blocked.addSubnet('192.168.0.0', 16, 'ipv4') // private
blocked.addSubnet('198.18.0.0', 15, 'ipv4') // benchmark
blocked.addSubnet('198.51.100.0', 24, 'ipv4') // documentation
blocked.addSubnet('203.0.113.0', 24, 'ipv4') // documentation
blocked.addSubnet('224.0.0.0', 4, 'ipv4') // multicast
blocked.addSubnet('240.0.0.0', 4, 'ipv4') // reserved and broadcast
// IPv6 ranges that must stay unreachable.
blocked.addAddress('::', 'ipv6') // unspecified
blocked.addAddress('::1', 'ipv6') // loopback
blocked.addSubnet('64:ff9b::', 96, 'ipv6') // NAT64 to IPv4
blocked.addSubnet('64:ff9b:1::', 48, 'ipv6') // local-use NAT64
blocked.addSubnet('100::', 64, 'ipv6') // discard-only
blocked.addSubnet('2001::', 32, 'ipv6') // Teredo
blocked.addSubnet('2001:db8::', 32, 'ipv6') // documentation
blocked.addSubnet('2002::', 16, 'ipv6') // 6to4
blocked.addSubnet('fc00::', 7, 'ipv6') // unique local
blocked.addSubnet('fe80::', 10, 'ipv6') // link-local
blocked.addSubnet('ff00::', 8, 'ipv6') // multicast

function deny(message: string): never {
  throw createError({
    statusCode: 400,
    message
  })
}

function isBlockedAddress(address: string, family?: 4 | 6): boolean {
  if (family === 4 || isIPv4(address)) {
    return blocked.check(address, 'ipv4')
  }
  if (family === 6 || isIPv6(address)) {
    // BlockList maps IPv4-mapped IPv6 addresses onto the IPv4 rules.
    return blocked.check(address, 'ipv6')
  }
  return false
}

function hostKey(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, '').replace(/\.+$/, '').toLowerCase()
}

export interface SafeUrlOptions {
  /** Ports the caller accepts. Defaults to `WEB_PORTS`. */
  allowedPorts?: readonly number[]
}

function assertAllowedPort(url: URL, allowedPorts: readonly number[]): void {
  // An empty `port` means the protocol default (80 or 443).
  const port = url.port === ''
    ? (url.protocol === 'https:' ? 443 : 80)
    : Number(url.port)

  if (!Number.isInteger(port) || !allowedPorts.includes(port)) {
    deny(`This port is not allowed. Use one of: ${allowedPorts.join(', ')}.`)
  }
}

export async function assertSafeUrl(input: string, options: SafeUrlOptions = {}): Promise<URL> {
  const allowedPorts = options.allowedPorts ?? WEB_PORTS

  let url: URL
  try {
    url = new URL(input)
  } catch {
    deny('Enter a valid URL.')
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    deny('Use HTTP or HTTPS only.')
  }

  if (url.username !== '' || url.password !== '') {
    deny('Remove credentials from the URL.')
  }

  assertAllowedPort(url, allowedPorts)

  const hostname = hostKey(url.hostname)

  if (BLOCKED_HOSTS.has(hostname) || hostname.endsWith('.localhost') || hostname.endsWith('.internal')) {
    deny('This host is not allowed.')
  }

  if (isIPv4(hostname) || isIPv6(hostname)) {
    if (isBlockedAddress(hostname)) {
      deny('This host is not allowed.')
    }
    return url
  }

  // ponytail: DNS rebinding remains a residual risk. Addresses are checked at
  // lookup time. An attacker can change DNS before the fetch. Phase 2 can add
  // reconnect checks.
  let records: { address: string, family: 4 | 6 }[]
  try {
    records = await Bun.dns.lookup(hostname)
  } catch {
    deny('This host is not allowed.')
  }

  if (records.length === 0 || records.some(record => isBlockedAddress(record.address, record.family))) {
    deny('This host is not allowed.')
  }

  return url
}
