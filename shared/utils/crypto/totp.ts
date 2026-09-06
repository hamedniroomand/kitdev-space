const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Decode(base32: string): Uint8Array {
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '')
  if (!clean) {
    throw new Error('Base32 string cannot be empty.')
  }

  let bits = ''
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]!
    const val = BASE32_ALPHABET.indexOf(char)
    if (val === -1) {
      throw new Error(`Invalid Base32 character: "${char}"`)
    }
    bits += val.toString(2).padStart(5, '0')
  }

  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.substring(i, i + 8), 2))
  }

  return new Uint8Array(bytes)
}

export function base32Encode(bytes: Uint8Array): string {
  let bits = ''
  for (let i = 0; i < bytes.length; i++) {
    bits += bytes[i]!.toString(2).padStart(8, '0')
  }

  let base32 = ''
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5).padEnd(5, '0')
    base32 += BASE32_ALPHABET[Number.parseInt(chunk, 2)]
  }

  return base32
}

export interface TotpOptions {
  time?: number
  period?: number
  digits?: number
  algorithm?: 'SHA-1' | 'SHA-256' | 'SHA-512'
}

export interface TotpResult {
  code: string
  remainingSeconds: number
  progress: number
}

export function parseTotpUri(uri: string): {
  secret: string
  issuer?: string
  label?: string
  period?: number
  digits?: number
  algorithm?: 'SHA-1' | 'SHA-256' | 'SHA-512'
} | null {
  try {
    if (!uri.startsWith('otpauth://totp/')) return null
    const url = new URL(uri)
    const secret = url.searchParams.get('secret')
    if (!secret) return null

    const issuer = url.searchParams.get('issuer') || undefined
    const rawLabel = url.pathname.replace(/^\/+/, '')
    const label = decodeURIComponent(rawLabel) || undefined
    const period = Number.parseInt(url.searchParams.get('period') || '30', 10)
    const digits = Number.parseInt(url.searchParams.get('digits') || '6', 10)
    const algoParam = url.searchParams.get('algorithm')?.toUpperCase()
    let algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512' = 'SHA-1'
    if (algoParam === 'SHA256' || algoParam === 'SHA-256') algorithm = 'SHA-256'
    else if (algoParam === 'SHA512' || algoParam === 'SHA-512') algorithm = 'SHA-512'

    return {
      secret,
      issuer,
      label,
      period: Number.isNaN(period) ? 30 : period,
      digits: Number.isNaN(digits) ? 6 : digits,
      algorithm
    }
  } catch {
    return null
  }
}

export async function generateTotp(
  secretInput: string,
  options: TotpOptions = {}
): Promise<TotpResult> {
  const period = options.period ?? 30
  const digits = options.digits ?? 6
  const algorithm = options.algorithm ?? 'SHA-1'
  const now = options.time ?? Date.now()

  let rawSecret = secretInput.trim()
  const parsedUri = parseTotpUri(rawSecret)
  if (parsedUri) {
    rawSecret = parsedUri.secret
  }

  const keyBytes = base32Decode(rawSecret)
  const epochSeconds = Math.floor(now / 1000)
  const counter = Math.floor(epochSeconds / period)
  const remainingSeconds = period - (epochSeconds % period)
  const progress = ((period - remainingSeconds) / period) * 100

  const counterBytes = new Uint8Array(8)
  let tmp = counter
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = tmp & 0xff
    tmp = Math.floor(tmp / 256)
  }

  const cryptoObj = globalThis.crypto
  if (!cryptoObj?.subtle) {
    throw new Error('Web Crypto API is not available in this environment.')
  }

  const cryptoKey = await cryptoObj.subtle.importKey(
    'raw',
    keyBytes as unknown as BufferSource,
    { name: 'HMAC', hash: { name: algorithm } },
    false,
    ['sign']
  )

  const hmacBuffer = await cryptoObj.subtle.sign(
    'HMAC',
    cryptoKey,
    counterBytes as unknown as BufferSource
  )
  const hmac = new Uint8Array(hmacBuffer)

  const offset = hmac[hmac.length - 1]! & 0x0f
  const codeInt = ((hmac[offset]! & 0x7f) << 24)
    | ((hmac[offset + 1]! & 0xff) << 16)
    | ((hmac[offset + 2]! & 0xff) << 8)
    | (hmac[offset + 3]! & 0xff)

  const mod = Math.pow(10, digits)
  const code = (codeInt % mod).toString().padStart(digits, '0')

  return {
    code,
    remainingSeconds,
    progress
  }
}

export function generateTotpSecret(byteLength = 20): string {
  const bytes = new Uint8Array(byteLength)
  globalThis.crypto.getRandomValues(bytes)
  return base32Encode(bytes)
}
