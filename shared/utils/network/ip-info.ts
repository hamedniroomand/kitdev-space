export interface IpInfo {
  ip: string
  version: 4 | 6
  type: 'public' | 'private' | 'loopback' | 'link-local' | 'multicast' | 'reserved'
  isSpecial: boolean
  decimal?: string
  hex?: string
  binary?: string
  hostname?: string | null
}

export function analyzeIp(ipString: string): IpInfo {
  const ip = ipString.trim()
  if (!ip) {
    throw new Error('IP address cannot be empty.')
  }

  // Check IPv4
  if (ip.includes('.')) {
    const octets = ip.split('.').map(s => Number.parseInt(s, 10))
    if (octets.length !== 4 || octets.some(o => Number.isNaN(o) || o < 0 || o > 255)) {
      throw new Error(`Invalid IPv4 address: "${ip}"`)
    }

    const first = octets[0]!
    const second = octets[1]!
    const num = ((first << 24) | (second << 16) | (octets[2]! << 8) | octets[3]!) >>> 0

    let type: IpInfo['type'] = 'public'
    if (first === 127) {
      type = 'loopback'
    }
    else if (first === 10 || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168)) {
      type = 'private'
    }
    else if (first === 169 && second === 254) {
      type = 'link-local'
    }
    else if (first >= 224 && first <= 239) {
      type = 'multicast'
    }
    else if (first >= 240) {
      type = 'reserved'
    }

    return {
      ip,
      version: 4,
      type,
      isSpecial: type !== 'public',
      decimal: num.toString(10),
      hex: `0x${num.toString(16).toUpperCase().padStart(8, '0')}`,
      binary: [
        first.toString(2).padStart(8, '0'),
        second.toString(2).padStart(8, '0'),
        octets[2]!.toString(2).padStart(8, '0'),
        octets[3]!.toString(2).padStart(8, '0'),
      ].join('.'),
    }
  }

  // Check IPv6
  if (ip.includes(':')) {
    // Basic IPv6 validation
    const isV6 = /^(?:[0-9a-f]{0,4}:){1,7}[0-9a-f]{0,4}$/i.test(ip) || ip === '::1' || ip === '::'
    if (!isV6) {
      throw new Error(`Invalid IPv6 address: "${ip}"`)
    }

    const lower = ip.toLowerCase()
    let type: IpInfo['type'] = 'public'
    if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') {
      type = 'loopback'
    }
    else if (lower.startsWith('fe80:')) {
      type = 'link-local'
    }
    else if (lower.startsWith('fc') || lower.startsWith('fd')) {
      type = 'private'
    }
    else if (lower.startsWith('ff')) {
      type = 'multicast'
    }

    return {
      ip,
      version: 6,
      type,
      isSpecial: type !== 'public',
    }
  }

  throw new Error(`Invalid IP address format: "${ip}"`)
}
