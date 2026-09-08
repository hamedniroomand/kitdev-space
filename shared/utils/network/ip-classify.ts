export type IpClassificationType = 'public' | 'private' | 'loopback' | 'link-local' | 'multicast' | 'reserved'

export interface IpClassification {
  ip: string
  version: 4 | 6
  type: IpClassificationType
  isPrivate: boolean
  isLoopback: boolean
  isLinkLocal: boolean
  isMulticast: boolean
  isReserved: boolean
  isSpecial: boolean
  decimal?: string
  hex?: string
  binary?: string
}

const IPV4_RE = /^(?:0|[1-9]\d{0,2})\.(?:0|[1-9]\d{0,2})\.(?:0|[1-9]\d{0,2})\.(?:0|[1-9]\d{0,2})$/

function parseIpv4Octets(ip: string): [number, number, number, number] {
  if (!IPV4_RE.test(ip)) {
    throw new Error(`Invalid IPv4 address: "${ip}"`)
  }
  const octets = ip.split('.').map(Number)
  if (octets.length !== 4 || octets.some(o => Number.isNaN(o) || o < 0 || o > 255)) {
    throw new Error(`Invalid IPv4 address: "${ip}"`)
  }
  return [octets[0]!, octets[1]!, octets[2]!, octets[3]!]
}

function parseIpv6Hextets(ip: string): number[] {
  let address = ip.toLowerCase()

  // Handle IPv4-mapped IPv6 addresses, e.g. ::ffff:192.0.2.1
  const v4Index = address.lastIndexOf(':')
  const possibleV4 = address.slice(v4Index + 1)
  if (possibleV4.includes('.')) {
    const octets = parseIpv4Octets(possibleV4)
    const high = (octets[0] << 8) | octets[1]
    const low = (octets[2] << 8) | octets[3]
    address = `${address.slice(0, v4Index)}:${high.toString(16)}:${low.toString(16)}`
  }

  const doubleColonCount = (address.match(/::/g) || []).length
  if (doubleColonCount > 1) {
    throw new Error(`Invalid IPv6 address: "${ip}"`)
  }

  let parts: string[]
  if (doubleColonCount === 1) {
    const [head, tail] = address.split('::')
    const headParts = head ? head.split(':') : []
    const tailParts = tail ? tail.split(':') : []
    const missing = 8 - (headParts.length + tailParts.length)
    if (missing < 1) {
      throw new Error(`Invalid IPv6 address: "${ip}"`)
    }
    const zeroes = Array.from<string>({ length: missing }).fill('0')
    parts = [...headParts, ...zeroes, ...tailParts]
  }
  else {
    parts = address.split(':')
  }

  if (parts.length !== 8) {
    throw new Error(`Invalid IPv6 address: "${ip}"`)
  }

  return parts.map((part) => {
    if (!/^[0-9a-f]{1,4}$/i.test(part)) {
      throw new Error(`Invalid IPv6 address: "${ip}"`)
    }
    return Number.parseInt(part, 16)
  })
}

export function classifyIp(ipString: string): IpClassification {
  const ip = ipString.trim()
  if (!ip) {
    throw new Error('IP address cannot be empty.')
  }

  if (ip.includes('.')) {
    const [first, second, third, fourth] = parseIpv4Octets(ip)
    const num = ((first << 24) | (second << 16) | (third << 8) | fourth) >>> 0

    let type: IpClassificationType = 'public'

    if (first === 127) {
      type = 'loopback'
    }
    else if (
      first === 10
      || (first === 172 && second >= 16 && second <= 31)
      || (first === 192 && second === 168)
    ) {
      type = 'private'
    }
    else if (first === 169 && second === 254) {
      type = 'link-local'
    }
    else if (first >= 224 && first <= 239) {
      type = 'multicast'
    }
    else if (
      first === 0
      || (first === 100 && second >= 64 && second <= 127)
      || (first === 192 && second === 0 && third === 0)
      || (first === 192 && second === 0 && third === 2)
      || (first === 198 && (second === 18 || second === 19))
      || (first === 198 && second === 51 && third === 100)
      || (first === 203 && second === 0 && third === 113)
      || first >= 240
    ) {
      type = 'reserved'
    }

    return {
      ip,
      version: 4,
      type,
      isPrivate: type === 'private',
      isLoopback: type === 'loopback',
      isLinkLocal: type === 'link-local',
      isMulticast: type === 'multicast',
      isReserved: type === 'reserved',
      isSpecial: type !== 'public',
      decimal: num.toString(10),
      hex: `0x${num.toString(16).toUpperCase().padStart(8, '0')}`,
      binary: [
        first.toString(2).padStart(8, '0'),
        second.toString(2).padStart(8, '0'),
        third.toString(2).padStart(8, '0'),
        fourth.toString(2).padStart(8, '0'),
      ].join('.'),
    }
  }

  if (ip.includes(':')) {
    const hextets = parseIpv6Hextets(ip)
    const first = hextets[0]!

    let type: IpClassificationType = 'public'

    // ::1 loopback
    if (hextets.slice(0, 7).every(h => h === 0) && hextets[7] === 1) {
      type = 'loopback'
    }
    // :: unspecified
    else if (hextets.every(h => h === 0)) {
      type = 'reserved'
    }
    // IPv4-mapped ::ffff:x.x.x.x
    else if (hextets.slice(0, 5).every(h => h === 0) && hextets[5] === 0xFFFF) {
      const v4_1 = (hextets[6]! >> 8) & 0xFF
      const v4_2 = hextets[6]! & 0xFF
      const v4_3 = (hextets[7]! >> 8) & 0xFF
      const v4_4 = hextets[7]! & 0xFF
      const mappedClassification = classifyIp(`${v4_1}.${v4_2}.${v4_3}.${v4_4}`)
      type = mappedClassification.type
    }
    // fe80::/10 link-local (fe80 to febf)
    else if ((first & 0xFFC0) === 0xFE80) {
      type = 'link-local'
    }
    // fc00::/7 unique local / private (fc00 to fdff)
    else if ((first & 0xFE00) === 0xFC00) {
      type = 'private'
    }
    // ff00::/8 multicast
    else if ((first & 0xFF00) === 0xFF00) {
      type = 'multicast'
    }
    // 2001:db8::/32 documentation or 64:ff9b::/96 NAT64 or 2002::/16 6to4
    else if (
      first === 0x2002
      || (first === 0x2001 && hextets[1] === 0x0DB8)
      || (first === 0x0064 && hextets[1] === 0xFF9B)
      || first === 0x0100
    ) {
      type = 'reserved'
    }

    return {
      ip,
      version: 6,
      type,
      isPrivate: type === 'private',
      isLoopback: type === 'loopback',
      isLinkLocal: type === 'link-local',
      isMulticast: type === 'multicast',
      isReserved: type === 'reserved',
      isSpecial: type !== 'public',
    }
  }

  throw new Error(`Invalid IP address format: "${ip}"`)
}
