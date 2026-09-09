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

/**
 * Envelope layout: `version | salt | iv | ciphertext and tag`.
 * Version 1 fixes PBKDF2-SHA-256 with 100000 iterations and AES-256-GCM.
 * A change to the key derivation needs a new version number.
 */
export const AES_ENVELOPE_VERSION = 1

const SALT_BYTES = 16
const IV_BYTES = 12
const TAG_BYTES = 16
/** The salt and the IV of an unversioned payload from an earlier release. */
const LEGACY_HEADER_BYTES = SALT_BYTES + IV_BYTES
const VERSIONED_HEADER_BYTES = 1 + LEGACY_HEADER_BYTES

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

  const salt = new Uint8Array(SALT_BYTES)
  cryptoObj.getRandomValues(salt)

  const iv = new Uint8Array(IV_BYTES)
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

  const packed = new Uint8Array(VERSIONED_HEADER_BYTES + ciphertextBytes.length)
  packed[0] = AES_ENVELOPE_VERSION
  packed.set(salt, 1)
  packed.set(iv, 1 + SALT_BYTES)
  packed.set(ciphertextBytes, VERSIONED_HEADER_BYTES)

  return bytesToBase64(packed)
}

async function decryptEnvelope(
  packed: Uint8Array,
  password: string,
  iterations: number,
  offset: number,
): Promise<string> {
  const salt = packed.subarray(offset, offset + SALT_BYTES)
  const iv = packed.subarray(offset + SALT_BYTES, offset + SALT_BYTES + IV_BYTES)
  const ciphertext = packed.subarray(offset + SALT_BYTES + IV_BYTES)

  const key = await deriveAesKey(password, salt, iterations)

  const decrypted = await globalThis.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    ciphertext as unknown as BufferSource,
  )

  return new TextDecoder().decode(decrypted)
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

  if (packed.length < LEGACY_HEADER_BYTES + TAG_BYTES) {
    throw new Error('Ciphertext payload is too short.')
  }

  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is not available.')
  }

  /*
   * A random salt byte can hold the same value as the version byte, so the
   * layout cannot be read from the first byte. GCM checks its tag, so a trial
   * decryption is exact: try the versioned layout, then the legacy layout.
   * A legacy payload therefore costs two key derivations.
   */
  if (packed.length >= VERSIONED_HEADER_BYTES + TAG_BYTES) {
    try {
      return await decryptEnvelope(packed, password, iterations, 1)
    }
    catch {
      // The payload is not a version 1 envelope. Try the legacy layout.
    }
  }

  try {
    return await decryptEnvelope(packed, password, iterations, 0)
  }
  catch {
    throw new Error('Decryption failed. Incorrect password or corrupted ciphertext.')
  }
}
