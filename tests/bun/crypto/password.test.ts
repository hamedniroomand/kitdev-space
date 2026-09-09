import { describe, expect, it } from 'bun:test'
import { benchmarkPassword, clampRuns, medianDuration, verifyPasswordHash } from '#server/utils/crypto/password'

describe('benchmarkPassword', () => {
  it('hashes with bcrypt and reports duration', async () => {
    const result = await benchmarkPassword({
      password: 'test-password',
      algorithm: 'bcrypt',
      cost: 4,
      verify: true,
    })
    expect(result.hash.length).toBeGreaterThan(10)
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
    expect(result.verified).toBe(true)
  })

  it('clamps the repetition count to 1 to 3', () => {
    expect(clampRuns(undefined)).toBe(1)
    expect(clampRuns(0)).toBe(1)
    expect(clampRuns(-4)).toBe(1)
    expect(clampRuns('nope')).toBe(1)
    expect(clampRuns(2.9)).toBe(2)
    expect(clampRuns(3)).toBe(3)
    expect(clampRuns(99)).toBe(3)
    expect(clampRuns(Number.POSITIVE_INFINITY)).toBe(3)
  })

  it('takes the median of the run times', () => {
    expect(medianDuration([5])).toBe(5)
    expect(medianDuration([9, 1, 5])).toBe(5)
    expect(medianDuration([4, 7])).toBe(6)
  })

  it('runs at most 3 repetitions and reports the median', async () => {
    const result = await benchmarkPassword({
      password: 'test-password',
      algorithm: 'bcrypt',
      cost: 4,
      runs: 99,
    })
    expect(result.runs).toBe(3)
    expect(result.durations).toHaveLength(3)
    expect(result.durationMs).toBe(medianDuration(result.durations))
  })

  it('rejects over-ceiling cost', async () => {
    await expect(
      benchmarkPassword({ password: 'x', algorithm: 'bcrypt', cost: 20 }),
    ).rejects.toThrow()
  })
})

describe('verifyPasswordHash', () => {
  it('reports a match and a wrong password for a bcrypt hash', async () => {
    const hash = await Bun.password.hash('test-password', { algorithm: 'bcrypt', cost: 4 })
    expect(await verifyPasswordHash({ password: 'test-password', hash })).toBe(true)
    expect(await verifyPasswordHash({ password: 'wrong-password', hash })).toBe(false)
  })

  it('reports a match for an argon2id hash', async () => {
    const hash = await Bun.password.hash('test-password', {
      algorithm: 'argon2id',
      memoryCost: 1024,
      timeCost: 1,
    })
    expect(hash.startsWith('$argon2id$')).toBe(true)
    expect(await verifyPasswordHash({ password: 'test-password', hash })).toBe(true)
  })

  it('rejects an input that is not a hash string', async () => {
    await expect(
      verifyPasswordHash({ password: 'test-password', hash: 'not-a-hash' }),
    ).rejects.toThrow()
  })

  it('rejects a hash string that is too long', async () => {
    await expect(
      verifyPasswordHash({ password: 'test-password', hash: `$2b$10$${'a'.repeat(600)}` }),
    ).rejects.toThrow()
  })

  it('rejects an empty password', async () => {
    const hash = await Bun.password.hash('test-password', { algorithm: 'bcrypt', cost: 4 })
    await expect(verifyPasswordHash({ password: '', hash })).rejects.toThrow()
  })
})
