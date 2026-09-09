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

export function bytesToBase64(bytes: Uint8Array): string {
  return btoa(bytesToBinary(bytes))
}

export function base64ToBytes(text: string): Uint8Array {
  try {
    return binaryToBytes(atob(text.trim()))
  }
  catch (cause) {
    throw new Error('Invalid Base64.\n\nCheck the input and try again.', { cause })
  }
}

export function encodeBase64(text: string): string {
  return bytesToBase64(new TextEncoder().encode(text))
}

export function decodeBase64(text: string): string {
  return new TextDecoder().decode(base64ToBytes(text))
}
