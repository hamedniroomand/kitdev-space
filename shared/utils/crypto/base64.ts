function bytesToBinary(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return binary
}

function binaryToBytes(binary: string): Uint8Array {
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

export function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  return btoa(bytesToBinary(bytes))
}

export function decodeBase64(text: string): string {
  try {
    const binary = atob(text.trim())
    return new TextDecoder().decode(binaryToBytes(binary))
  } catch (cause) {
    throw new Error('Invalid Base64.\n\nCheck the input and try again.', { cause })
  }
}
