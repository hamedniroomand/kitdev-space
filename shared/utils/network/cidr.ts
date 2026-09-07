export interface CidrCalculation {
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
  isPrivate: boolean
  isLoopback: boolean
  isLinkLocal: boolean
  ipBinary: string
  maskBinary: string
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

  const secondOctet = (ipInt >>> 16) & 255
  const isPrivate = firstOctet === 10
    || (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31)
    || (firstOctet === 192 && secondOctet === 168)

  const isLoopback = firstOctet === 127
  const isLinkLocal = firstOctet === 169 && secondOctet === 254

  return {
    ip: intToIp(ipInt),
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
    isPrivate,
    isLoopback,
    isLinkLocal,
    ipBinary: toBinaryString(ipInt),
    maskBinary: toBinaryString(maskInt),
  }
}
