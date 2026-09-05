import { describe, expect, it } from 'bun:test'
import { hashText } from '../../../server/utils/crypto/hash'

describe('hashText', () => {
  it('hashes sha256', () => {
    expect(hashText('hello', 'sha256')).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
    )
  })
})
