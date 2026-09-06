export type IdType = 'uuidv4' | 'uuidv7' | 'ulid' | 'nanoid'

const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const NANOID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'

export function createUuid(): string {
  return crypto.randomUUID()
}

export function createUuidV4(): string {
  return crypto.randomUUID()
}

export function createUuidV7(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)

  const now = Date.now()
  bytes[0] = Math.floor(now / 0x10000000000) & 0xff
  bytes[1] = Math.floor(now / 0x100000000) & 0xff
  bytes[2] = (now >>> 24) & 0xff
  bytes[3] = (now >>> 16) & 0xff
  bytes[4] = (now >>> 8) & 0xff
  bytes[5] = now & 0xff

  bytes[6] = 0x70 | (bytes[6]! & 0x0f)
  bytes[8] = 0x80 | (bytes[8]! & 0x3f)

  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

export function createUlid(): string {
  const now = Date.now()
  let timeStr = ''
  let time = now
  for (let i = 0; i < 10; i++) {
    const mod = time % 32
    timeStr = CROCKFORD_BASE32[mod] + timeStr
    time = Math.floor(time / 32)
  }

  const randomBytes = new Uint8Array(10)
  crypto.getRandomValues(randomBytes)
  let randStr = ''
  for (let i = 0; i < 16; i++) {
    const byteIndex = Math.floor((i * 5) / 8)
    const bitOffset = (i * 5) % 8
    let val = (randomBytes[byteIndex]! << 8) | (randomBytes[byteIndex + 1] ?? 0)
    val = (val >>> (11 - bitOffset)) & 0x1f
    randStr += CROCKFORD_BASE32[val]
  }

  return timeStr + randStr
}

export function createNanoId(size = 21): string {
  const targetSize = Math.max(1, Math.min(128, size))
  const bytes = new Uint8Array(targetSize)
  crypto.getRandomValues(bytes)

  let result = ''
  const mask = 63
  for (let i = 0; i < targetSize; i++) {
    result += NANOID_ALPHABET[bytes[i]! & mask]
  }
  return result
}

export function createId(type: IdType, options?: { nanoIdLength?: number }): string {
  switch (type) {
    case 'uuidv7':
      return createUuidV7()
    case 'ulid':
      return createUlid()
    case 'nanoid':
      return createNanoId(options?.nanoIdLength ?? 21)
    case 'uuidv4':
    default:
      return createUuidV4()
  }
}
