import { describe, expect, it } from 'bun:test'
import { benchmarkPassword } from '#server/utils/crypto/password'

describe('benchmarkPassword', () => {
  it('hashes with bcrypt and reports duration', async () => {
    const result = await benchmarkPassword({
      password: 'test-password',
      algorithm: 'bcrypt',
      cost: 4,
      verify: true
    })
    expect(result.hash.length).toBeGreaterThan(10)
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
    expect(result.verified).toBe(true)
  })

  it('rejects over-ceiling cost', async () => {
    await expect(
      benchmarkPassword({ password: 'x', algorithm: 'bcrypt', cost: 20 })
    ).rejects.toThrow()
  })
})
