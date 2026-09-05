import { BlockList, isIPv4, isIPv6 } from 'node:net'
import { createError } from 'h3'

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])
const BLOCKED_HOSTS = new Set(['localhost', 'metadata.google.internal'])

const blocked = new BlockList()
blocked.addSubnet('127.0.0.0', 8, 'ipv4')
blocked.addSubnet('10.0.0.0', 8, 'ipv4')
blocked.addSubnet('172.16.0.0', 12, 'ipv4')
blocked.addSubnet('192.168.0.0', 16, 'ipv4')
blocked.addSubnet('169.254.0.0', 16, 'ipv4')
blocked.addAddress('::1', 'ipv6')
blocked.addSubnet('fc00::', 7, 'ipv6')
blocked.addSubnet('fe80::', 10, 'ipv6')

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
    return blocked.check(address, 'ipv6')
  }
  return false
}

function hostKey(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, '').replace(/\.+$/, '').toLowerCase()
}

export async function assertSafeUrl(input: string): Promise<URL> {
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

  const hostname = hostKey(url.hostname)

  if (BLOCKED_HOSTS.has(hostname)) {
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
