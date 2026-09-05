export function encodeHex(text: string): string {
  const bytes = new TextEncoder().encode(text)
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

export function decodeHex(text: string): string {
  const cleaned = text.trim().replace(/\s+/g, '')
  if (cleaned.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(cleaned)) {
    throw new Error('Invalid hex.\n\nUse an even number of hex digits.')
  }

  const bytes = new Uint8Array(cleaned.length / 2)
  for (let index = 0; index < cleaned.length; index += 2) {
    bytes[index / 2] = Number.parseInt(cleaned.slice(index, index + 2), 16)
  }

  return new TextDecoder().decode(bytes)
}
