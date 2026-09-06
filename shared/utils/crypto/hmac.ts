export type HmacAlgorithm = 'SHA-256' | 'SHA-384' | 'SHA-512' | 'SHA-1'
export type HmacEncoding = 'hex' | 'base64'

export async function generateHmac(
  message: string,
  secret: string,
  algorithm: HmacAlgorithm = 'SHA-256',
  encoding: HmacEncoding = 'hex'
): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(message)

  const cryptoObj = globalThis.crypto
  if (!cryptoObj?.subtle) {
    throw new Error('Web Crypto API is not available in this environment.')
  }

  const cryptoKey = await cryptoObj.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: { name: algorithm } },
    false,
    ['sign']
  )

  const signatureBuffer = await cryptoObj.subtle.sign('HMAC', cryptoKey, messageData)
  const bytes = new Uint8Array(signatureBuffer)

  if (encoding === 'base64') {
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]!)
    }
    return btoa(binary)
  }

  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export function generateRandomSecret(length = 32): string {
  const bytes = new Uint8Array(length)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
