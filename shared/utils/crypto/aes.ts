// `btoa` and `atob` exist in every browser, in Node 16 and later, and in Bun.
function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function deriveAesKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passwordBytes = encoder.encode(password)

  const cryptoObj = globalThis.crypto
  if (!cryptoObj?.subtle) {
    throw new Error('Web Crypto API is not available.')
  }

  const passwordKey = await cryptoObj.subtle.importKey(
    'raw',
    passwordBytes as unknown as BufferSource,
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  return cryptoObj.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptAesGcm(
  plaintext: string,
  password: string,
  iterations = 100000,
): Promise<string> {
  if (!password) {
    throw new Error('Enter a password to encrypt the text.')
  }

  const cryptoObj = globalThis.crypto
  if (!cryptoObj?.subtle) {
    throw new Error('Web Crypto API is not available.')
  }

  const salt = new Uint8Array(16)
  cryptoObj.getRandomValues(salt)

  const iv = new Uint8Array(12)
  cryptoObj.getRandomValues(iv)

  const key = await deriveAesKey(password, salt, iterations)

  const encoder = new TextEncoder()
  const plaintextBytes = encoder.encode(plaintext)

  const ciphertextBuffer = await cryptoObj.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    plaintextBytes as unknown as BufferSource,
  )
  const ciphertextBytes = new Uint8Array(ciphertextBuffer)

  // Combined payload: [16 bytes salt][12 bytes IV][ciphertext + tag]
  const packed = new Uint8Array(salt.length + iv.length + ciphertextBytes.length)
  packed.set(salt, 0)
  packed.set(iv, salt.length)
  packed.set(ciphertextBytes, salt.length + iv.length)

  return bytesToBase64(packed)
}

export async function decryptAesGcm(
  ciphertextBase64: string,
  password: string,
  iterations = 100000,
): Promise<string> {
  if (!password) {
    throw new Error('Enter a password to decrypt the text.')
  }

  const trimmed = ciphertextBase64.trim()
  if (!trimmed) {
    throw new Error('Encrypted ciphertext cannot be empty.')
  }

  let packed: Uint8Array
  try {
    packed = base64ToBytes(trimmed)
  }
  catch {
    throw new Error('Invalid Base64 ciphertext format.')
  }

  if (packed.length < 28) {
    throw new Error('Ciphertext payload is too short.')
  }

  const salt = packed.subarray(0, 16)
  const iv = packed.subarray(16, 28)
  const ciphertext = packed.subarray(28)

  const cryptoObj = globalThis.crypto
  if (!cryptoObj?.subtle) {
    throw new Error('Web Crypto API is not available.')
  }

  const key = await deriveAesKey(password, salt, iterations)

  try {
    const decryptedBuffer = await cryptoObj.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      key,
      ciphertext as unknown as BufferSource,
    )

    const decoder = new TextDecoder()
    return decoder.decode(decryptedBuffer)
  }
  catch {
    throw new Error('Decryption failed. Incorrect password or corrupted ciphertext.')
  }
}
