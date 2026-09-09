import type { IpClassificationType } from './ip-classify'
import { classifyIp } from './ip-classify'

export interface CidrV6Calculation {
  version: 6
  ip: string
  prefix: number
  /** First address of the block, in the short form. */
  networkAddress: string
  /** First address of the block, in the full 8-group form. */
  networkAddressFull: string
  lastAddress: string
  lastAddressFull: string
  /** Address count, as a plain decimal string. */
  totalAddresses: string
  scope: IpClassificationType
  isPrivate: boolean
  isLoopback: boolean
  isLinkLocal: boolean
  isMulticast: boolean
}

const IPV4_SUFFIX_RE = /^(?:0|[1-9]\d{0,2})\.(?:0|[1-9]\d{0,2})\.(?:0|[1-9]\d{0,2})\.(?:0|[1-9]\d{0,2})$/
const HEXTET_RE = /^[0-9a-f]{1,4}$/
const PREFIX_RE = /^\d{1,3}$/
const ADDRESS_BITS = 128n

function invalid(ip: string): Error {
  return new Error(`Invalid IPv6 address: "${ip}"`)
}

function toHextets(ipString: string): number[] {
  const original = ipString.trim()
  if (!original) {
    throw new Error('IPv6 address cannot be empty.')
  }

  let address = original.toLowerCase()
  if (!address.includes(':')) {
    throw invalid(original)
  }

  // An IPv4 tail, such as ::ffff:192.0.2.1, becomes two hextets.
  const lastColon = address.lastIndexOf(':')
  const tail = address.slice(lastColon + 1)
  if (tail.includes('.')) {
    if (!IPV4_SUFFIX_RE.test(tail)) {
      throw invalid(original)
    }
    const octets = tail.split('.').map(Number)
    if (octets.some(octet => octet > 255)) {
      throw invalid(original)
    }
    const high = (octets[0]! << 8) | octets[1]!
    const low = (octets[2]! << 8) | octets[3]!
    address = `${address.slice(0, lastColon + 1)}${high.toString(16)}:${low.toString(16)}`
  }

  const doubleColons = (address.match(/::/g) || []).length
  if (doubleColons > 1) {
    throw invalid(original)
  }

  let parts: string[]
  if (doubleColons === 1) {
    const [head = '', rest = ''] = address.split('::')
    const headParts = head ? head.split(':') : []
    const tailParts = rest ? rest.split(':') : []
    const missing = 8 - (headParts.length + tailParts.length)
    if (missing < 1) {
      throw invalid(original)
    }
    parts = [...headParts, ...Array.from<string>({ length: missing }).fill('0'), ...tailParts]
  }
  else {
    parts = address.split(':')
  }

  if (parts.length !== 8) {
    throw invalid(original)
  }

  return parts.map((part) => {
    if (!HEXTET_RE.test(part)) {
      throw invalid(original)
    }
    return Number.parseInt(part, 16)
  })
}

/** Convert an IPv6 address to one integer. */
export function ipv6ToBigInt(ip: string): bigint {
  return toHextets(ip).reduce((total, hextet) => (total << 16n) | BigInt(hextet), 0n)
}

/** Write an address in the full form, with 8 groups of 4 digits. */
export function expandIpv6(value: bigint): string {
  const groups: string[] = []
  for (let index = 7; index >= 0; index--) {
    const hextet = (value >> BigInt(index * 16)) & 0xFFFFn
    groups.push(hextet.toString(16).padStart(4, '0'))
  }
  return groups.join(':')
}

/** Write an address in the short form of RFC 5952. */
export function compressIpv6(value: bigint): string {
  const groups = expandIpv6(value).split(':').map(group => group.replace(/^0+(?=.)/, ''))

  let bestStart = -1
  let bestLength = 0
  let runStart = -1
  for (let index = 0; index < groups.length; index++) {
    if (groups[index] !== '0') {
      runStart = -1
      continue
    }
    if (runStart < 0) {
      runStart = index
    }
    const length = index - runStart + 1
    if (length > bestLength) {
      bestLength = length
      bestStart = runStart
    }
  }

  if (bestLength < 2) {
    return groups.join(':')
  }
  const head = groups.slice(0, bestStart).join(':')
  const tail = groups.slice(bestStart + bestLength).join(':')
  return `${head}::${tail}`
}

function splitCidrV6(cidrInput: string): { address: bigint, prefix: number } {
  const trimmed = cidrInput.trim()
  const parts = trimmed.split('/')
  const prefixString = parts.length > 1 ? (parts[1]?.trim() ?? '') : '128'

  if (!PREFIX_RE.test(prefixString) || Number.parseInt(prefixString, 10) > 128) {
    throw new Error('Prefix length must be between 0 and 128.')
  }

  return {
    address: ipv6ToBigInt(parts[0] ?? ''),
    prefix: Number.parseInt(prefixString, 10),
  }
}

/** First and last address of an IPv6 block. */
export function ipv6Range(cidrInput: string): { start: bigint, end: bigint } {
  const { address, prefix } = splitCidrV6(cidrInput)
  const size = 1n << (ADDRESS_BITS - BigInt(prefix))
  const start = (address / size) * size
  return { start, end: start + size - 1n }
}

export function parseCidrV6(cidrInput: string): CidrV6Calculation {
  const { address, prefix } = splitCidrV6(cidrInput)
  const size = 1n << (ADDRESS_BITS - BigInt(prefix))
  const start = (address / size) * size
  const end = start + size - 1n

  const classification = classifyIp(compressIpv6(address))

  return {
    version: 6,
    ip: compressIpv6(address),
    prefix,
    networkAddress: compressIpv6(start),
    networkAddressFull: expandIpv6(start),
    lastAddress: compressIpv6(end),
    lastAddressFull: expandIpv6(end),
    totalAddresses: size.toString(),
    scope: classification.type,
    isPrivate: classification.isPrivate,
    isLoopback: classification.isLoopback,
    isLinkLocal: classification.isLinkLocal,
    isMulticast: classification.isMulticast,
  }
}
