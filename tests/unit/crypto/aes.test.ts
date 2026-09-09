import { describe, expect, it } from 'vitest'
import {
  AES_ENVELOPE_VERSION,
  AUTH_ERROR,
  BASE64_ERROR,
  decryptAesGcm,
  encryptAesGcm,
  ENVELOPE_ERROR,
} from '#shared/utils/crypto/aes'

/**
 * Output of the unversioned release: `salt | iv | ciphertext and tag`.
 * Do not regenerate it. It proves that an old payload still decrypts.
 */
const LEGACY_PAYLOAD = {
  ciphertext: 'Le+ppFSAUv+DQsQHSXCc4GKVDt9OxpQ6YV9Y7+kgVEUP2I0BpiB6zz09LBzRwp7THu7xBvNhNX5teB8l63wHdmqs',
  password: 'legacy-password',
  plaintext: 'KitDev legacy envelope',
}

function toBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  return Uint8Array.from(binary, char => char.charCodeAt(0))
}

describe('aES-GCM versioned envelope', () => {
  it('writes the version byte in every new payload', async () => {
    const packed = toBytes(await encryptAesGcm('versioned', 'pass'))
    expect(packed[0]).toBe(AES_ENVELOPE_VERSION)
    expect(packed.length).toBe(1 + 16 + 12 + 'versioned'.length + 16)
  })

  it('decrypts an unversioned payload from an earlier release', async () => {
    const decrypted = await decryptAesGcm(LEGACY_PAYLOAD.ciphertext, LEGACY_PAYLOAD.password)
    expect(decrypted).toBe(LEGACY_PAYLOAD.plaintext)
  })

  it('rejects the legacy payload with a wrong password', async () => {
    await expect(decryptAesGcm(LEGACY_PAYLOAD.ciphertext, 'wrong-password')).rejects.toThrow()
  })
})

describe('aES-GCM encryption and decryption', () => {
  it('encrypts and decrypts text round-trip successfully', async () => {
    const original = 'KitDev Space Secret Payload 🚀'
    const password = 'SuperSecretPassword123!'

    const encrypted = await encryptAesGcm(original, password)
    expect(encrypted).toBeTypeOf('string')
    expect(encrypted).not.toBe(original)

    const decrypted = await decryptAesGcm(encrypted, password)
    expect(decrypted).toBe(original)
  })

  it('throws on empty password', async () => {
    await expect(encryptAesGcm('test', '')).rejects.toThrow('Enter a password')
    await expect(decryptAesGcm('test', '')).rejects.toThrow('Enter a password')
  })
})

describe('aES-GCM error classification', () => {
  it('reports invalid Base64 formatting', async () => {
    await expect(decryptAesGcm('not base64 ***', 'pass')).rejects.toThrow(BASE64_ERROR)
    await expect(decryptAesGcm('QUJD', 'pass')).rejects.toThrow(ENVELOPE_ERROR)
  })

  it('reports a truncated envelope', async () => {
    const encrypted = await encryptAesGcm('Short envelope', 'pass')
    const truncated = encrypted.slice(0, 8)

    await expect(decryptAesGcm(truncated, 'pass')).rejects.toThrow(ENVELOPE_ERROR)
  })

  /*
   * GCM reports one event for a wrong password and for changed data: the tag
   * check fails. Both cases therefore give the same message, and the message
   * names both causes.
   */
  it('reports a tag failure for a wrong password', async () => {
    const encrypted = await encryptAesGcm('Confidential', 'correct-pass')

    await expect(decryptAesGcm(encrypted, 'wrong-pass')).rejects.toThrow(AUTH_ERROR)
  })

  it('reports a tag failure for tampered ciphertext', async () => {
    const encrypted = await encryptAesGcm('Tamper test', 'pass')
    const tampered = encrypted.slice(0, 40) + (encrypted[40] === 'A' ? 'B' : 'A') + encrypted.slice(41)

    await expect(decryptAesGcm(tampered, 'pass')).rejects.toThrow(AUTH_ERROR)
  })

  it('leaks no key material and no plaintext in a message', async () => {
    const encrypted = await encryptAesGcm('Confidential', 'correct-pass')
    const error = await decryptAesGcm(encrypted, 'wrong-pass').catch((cause: Error) => cause)

    expect((error as Error).message).not.toContain('Confidential')
    expect((error as Error).message).not.toContain('correct-pass')
  })
})
