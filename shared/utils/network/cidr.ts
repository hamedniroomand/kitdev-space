import type { CidrV6Calculation } from './cidr-ipv6'
import type { IpClassificationType } from './ip-classify'
import { ipv6Range, ipv6ToBigInt, parseCidrV6 } from './cidr-ipv6'
import { classifyIp } from './ip-classify'

export interface CidrCalculation {
  version: 4
  ip: string
  prefix: number
  netmask: string
  wildcard: string
  networkAddress: string
  broadcastAddress: string
  firstUsableIp: string
  lastUsableIp: string
  totalHosts: number
  usableHosts: number
  ipClass: 'A' | 'B' | 'C' | 'D' | 'E'
  scope: IpClassificationType
  isPrivate: boolean
  isLoopback: boolean
  isLinkLocal: boolean
  ipBinary: string
  maskBinary: string
}

/** How two CIDR blocks relate to each other. */
export type CidrRelation = 'equal' | 'contains' | 'within' | 'disjoint'

export interface CidrComparison {
  relation: CidrRelation
  overlaps: boolean
  /** Count of addresses in both blocks, as a plain decimal string. */
  sharedAddresses: string
}

interface CidrRange {
  version: 4 | 6
  start: bigint
  end: bigint
}

const IPV4_STRICT_RE = /^(?:0|[1-9]\d{0,2})\.(?:0|[1-9]\d{0,2})\.(?:0|[1-9]\d{0,2})\.(?:0|[1-9]\d{0,2})$/

function ipToInt(ip: string): number {
  if (!IPV4_STRICT_RE.test(ip)) {
    throw new Error(`Invalid IPv4 address: "${ip}"`)
  }
  const octets = ip.split('.').map(Number)
  if (octets.length !== 4 || octets.some(o => Number.isNaN(o) || o < 0 || o > 255)) {
    throw new Error(`Invalid IPv4 address: "${ip}"`)
  }
  return ((octets[0]! << 24) | (octets[1]! << 16) | (octets[2]! << 8) | octets[3]!) >>> 0
}

function intToIp(num: number): string {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255,
  ].join('.')
}

function toBinaryString(num: number): string {
  return [
    ((num >>> 24) & 255).toString(2).padStart(8, '0'),
    ((num >>> 16) & 255).toString(2).padStart(8, '0'),
    ((num >>> 8) & 255).toString(2).padStart(8, '0'),
    (num & 255).toString(2).padStart(8, '0'),
  ].join('.')
}

export function parseCidr(cidrInput: string): CidrCalculation {
  const trimmed = cidrInput.trim()
  const parts = trimmed.split('/')
  const ipStr = parts[0]?.trim() || ''
  const prefixStr = parts[1]?.trim() || '32'

  const prefix = Number.parseInt(prefixStr, 10)
  if (Number.isNaN(prefix) || prefix < 0 || prefix > 32) {
    throw new Error('Prefix length must be between 0 and 32.')
  }

  const ipInt = ipToInt(ipStr)
  const maskInt = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0
  const wildcardInt = (~maskInt) >>> 0

  const networkInt = (ipInt & maskInt) >>> 0
  const broadcastInt = (networkInt | wildcardInt) >>> 0

  const totalHosts = prefix === 32 ? 1 : 2 ** (32 - prefix)
  let usableHosts: number
  let firstUsableInt: number
  let lastUsableInt: number

  if (prefix === 32) {
    usableHosts = 1
    firstUsableInt = networkInt
    lastUsableInt = networkInt
  }
  else if (prefix === 31) {
    // RFC 3021: 31-bit prefixes for point-to-point links
    usableHosts = 2
    firstUsableInt = networkInt
    lastUsableInt = broadcastInt
  }
  else {
    usableHosts = totalHosts - 2
    firstUsableInt = (networkInt + 1) >>> 0
    lastUsableInt = (broadcastInt - 1) >>> 0
  }

  const firstOctet = (ipInt >>> 24) & 255
  let ipClass: 'A' | 'B' | 'C' | 'D' | 'E'
  if (firstOctet >= 240)
    ipClass = 'E'
  else if (firstOctet >= 224)
    ipClass = 'D'
  else if (firstOctet >= 192)
    ipClass = 'C'
  else if (firstOctet >= 128)
    ipClass = 'B'
  else ipClass = 'A'

  const classification = classifyIp(intToIp(ipInt))

  return {
    version: 4,
    ip: classification.ip,
    prefix,
    netmask: intToIp(maskInt),
    wildcard: intToIp(wildcardInt),
    networkAddress: intToIp(networkInt),
    broadcastAddress: intToIp(broadcastInt),
    firstUsableIp: intToIp(firstUsableInt),
    lastUsableIp: intToIp(lastUsableInt),
    totalHosts,
    usableHosts,
    ipClass,
    scope: classification.type,
    isPrivate: classification.isPrivate,
    isLoopback: classification.isLoopback,
    isLinkLocal: classification.isLinkLocal,
    ipBinary: toBinaryString(ipInt),
    maskBinary: toBinaryString(maskInt),
  }
}

function cidrRange(cidr: string): CidrRange {
  if (cidr.includes(':')) {
    const { start, end } = ipv6Range(cidr)
    return { version: 6, start, end }
  }
  const calculation = parseCidr(cidr)
  return {
    version: 4,
    start: BigInt(ipToInt(calculation.networkAddress)),
    end: BigInt(ipToInt(calculation.broadcastAddress)),
  }
}

/** Test if an IP address is inside a CIDR block. */
export function cidrContainsIp(cidr: string, ip: string): boolean {
  const range = cidrRange(cidr)
  const trimmed = ip.trim()
  const version = trimmed.includes(':') ? 6 : 4
  if (version !== range.version) {
    throw new Error('The IP version must match the subnet version.')
  }
  const address = version === 6 ? ipv6ToBigInt(trimmed) : BigInt(ipToInt(trimmed))
  return address >= range.start && address <= range.end
}

/** Compare two CIDR blocks. Two blocks nest or stay fully apart. */
export function compareCidr(first: string, second: string): CidrComparison {
  const a = cidrRange(first)
  const b = cidrRange(second)

  if (a.version !== b.version) {
    throw new Error('Compare two blocks that use the same IP version.')
  }

  const start = a.start > b.start ? a.start : b.start
  const end = a.end < b.end ? a.end : b.end
  const shared = end >= start ? end - start + 1n : 0n

  let relation: CidrRelation = 'disjoint'
  if (shared > 0n) {
    if (a.start === b.start && a.end === b.end) {
      relation = 'equal'
    }
    else if (a.start <= b.start && a.end >= b.end) {
      relation = 'contains'
    }
    else {
      relation = 'within'
    }
  }

  return { relation, overlaps: shared > 0n, sharedAddresses: shared.toString() }
}

/** Read an IPv4 or an IPv6 block. The address family comes from the input. */
export function analyzeCidr(cidrInput: string): CidrCalculation | CidrV6Calculation {
  return cidrInput.includes(':') ? parseCidrV6(cidrInput) : parseCidr(cidrInput)
}
