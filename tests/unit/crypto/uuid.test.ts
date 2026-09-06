import { describe, expect, it } from 'vitest'
import {
  createId,
  createNanoId,
  createUlid,
  createUuid,
  createUuidV4,
  createUuidV7
} from '#shared/utils/crypto/uuid'

describe('uuid and id generators', () => {
  it('returns uuid v4 shape', () => {
    expect(createUuid()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
    expect(createUuidV4()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  })

  it('returns uuid v7 shape with version 7 and variant bits', () => {
    const id = createUuidV7()
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  })

  it('returns ulid shape with 26 Crockford base32 characters', () => {
    const id = createUlid()
    expect(id).toHaveLength(26)
    expect(id).toMatch(/^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/)
  })

  it('returns nanoid shape with custom or default length', () => {
    const idDefault = createNanoId()
    expect(idDefault).toHaveLength(21)
    expect(idDefault).toMatch(/^[A-Za-z0-9_-]{21}$/)

    const idCustom = createNanoId(16)
    expect(idCustom).toHaveLength(16)
    expect(idCustom).toMatch(/^[A-Za-z0-9_-]{16}$/)
  })

  it('generates ids through createId helper', () => {
    expect(createId('uuidv4')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
    expect(createId('uuidv7')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
    expect(createId('ulid')).toHaveLength(26)
    expect(createId('nanoid', { nanoIdLength: 10 })).toHaveLength(10)
  })
})
