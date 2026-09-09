import { describe, expect, it } from 'vitest'
import { createRandomString, randomStringAlphabet } from '#shared/utils/crypto/random-string'

describe('random string', () => {
  it('respects length and charset', () => {
    const value = createRandomString({ length: 16, charset: 'hex' })
    expect(value).toHaveLength(16)
    expect(value).toMatch(/^[0-9a-f]+$/i)
  })

  it('generates strings without rejection bias for various charsets', () => {
    const value = createRandomString({ length: 500, charset: 'numeric' })
    expect(value).toHaveLength(500)
    expect(value).toMatch(/^\d+$/)
    // Verify distribution covers digits 0-9
    const digits = new Set(value.split(''))
    expect(digits.size).toBe(10)
  })

  it('adds symbols to the alphabet', () => {
    const value = createRandomString({ length: 2000, charset: 'alnum', includeSymbols: true })
    expect(value).toMatch(/[!@#$%^&*()\-_=+[\]{}]/)
  })

  it('keeps ambiguous characters out of the alphabet', () => {
    const value = createRandomString({ length: 2000, charset: 'alnum', excludeAmbiguous: true })
    expect(value).not.toMatch(/[0Ol1I]/)
    expect(randomStringAlphabet({ charset: 'alnum', excludeAmbiguous: true })).toHaveLength(57)
  })

  // The symbol alphabet has 80 characters, so the test has 79 degrees of freedom.
  // 123.5944 is the chi-square critical value at p = 0.001. A lower p value makes
  // the test flaky, because a correct generator then fails about 1 run in 20.
  it('draws the symbol alphabet with a uniform distribution', () => {
    const alphabet = randomStringAlphabet({ charset: 'alnum', includeSymbols: true })
    const DEGREES_OF_FREEDOM = alphabet.length - 1
    const CRITICAL_VALUE = 123.5944
    const SAMPLE_SIZE = 100_000
    const BATCH_SIZE = 10_000

    expect(DEGREES_OF_FREEDOM).toBe(79)

    const counts = new Map<string, number>()
    for (let batch = 0; batch < SAMPLE_SIZE / BATCH_SIZE; batch += 1) {
      const value = createRandomString({ length: BATCH_SIZE, charset: 'alnum', includeSymbols: true })
      for (const char of value) {
        counts.set(char, (counts.get(char) ?? 0) + 1)
      }
    }

    const expected = SAMPLE_SIZE / alphabet.length
    let chiSquare = 0
    for (const char of alphabet) {
      const diff = (counts.get(char) ?? 0) - expected
      chiSquare += (diff * diff) / expected
    }

    expect(chiSquare).toBeLessThan(CRITICAL_VALUE)
  })
})
