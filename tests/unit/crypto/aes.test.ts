import { describe, expect, it } from 'vitest'
import { AES_ENVELOPE_VERSION, decryptAesGcm, encryptAesGcm } from '#shared/utils/crypto/aes'

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

  it('fails decryption when using incorrect password', async () => {
    const original = 'Confidential'
    const encrypted = await encryptAesGcm(original, 'correct-pass')

    await expect(decryptAesGcm(encrypted, 'wrong-pass')).rejects.toThrow('Decryption failed')
  })

  it('fails decryption on tampered ciphertext', async () => {
    const original = 'Tamper test'
    const encrypted = await encryptAesGcm(original, 'pass')

    // Tamper with base64 string
    const tampered = encrypted.slice(0, 10) + (encrypted[10] === 'A' ? 'B' : 'A') + encrypted.slice(11)
    await expect(decryptAesGcm(tampered, 'pass')).rejects.toThrow()
  })

  it('throws on empty password', async () => {
    await expect(encryptAesGcm('test', '')).rejects.toThrow('Enter a password')
    await expect(decryptAesGcm('test', '')).rejects.toThrow('Enter a password')
  })
})
