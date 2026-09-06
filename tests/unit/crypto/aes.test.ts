import { describe, expect, it } from 'vitest'
import { decryptAesGcm, encryptAesGcm } from '#shared/utils/crypto/aes'

describe('AES-GCM encryption and decryption', () => {
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
