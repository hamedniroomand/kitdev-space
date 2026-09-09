import { describe, expect, it } from 'vitest'
import {
  createId,
  createNanoId,
  createUlid,
  createUuid,
  createUuidV4,
  createUuidV7,
  inspectId,
} from '#shared/utils/crypto/uuid'

describe('uuid and id generators', () => {
  it('returns uuid v4 shape', () => {
    expect(createUuid()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
    expect(createUuidV4()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('returns uuid v7 shape with version 7 and variant bits', () => {
    const id = createUuidV7()
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('returns ulid shape with 26 Crockford base32 characters', () => {
    const id = createUlid()
    expect(id).toHaveLength(26)
    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/)
  })

  it('returns nanoid shape with custom or default length', () => {
    const idDefault = createNanoId()
    expect(idDefault).toHaveLength(21)
    expect(idDefault).toMatch(/^[\w-]{21}$/)

    const idCustom = createNanoId(16)
    expect(idCustom).toHaveLength(16)
    expect(idCustom).toMatch(/^[\w-]{16}$/)
  })

  it('reads the timestamp of a generated uuid v7', () => {
    const before = Date.now()
    const inspection = inspectId(createUuidV7())
    expect(inspection.format).toBe('uuidv7')
    expect(inspection.version).toBe(7)
    expect(inspection.timestampMs).toBeGreaterThanOrEqual(before - 1000)
    expect(inspection.timestampMs).toBeLessThanOrEqual(Date.now() + 1000)
    expect(inspection.iso).toBe(new Date(inspection.timestampMs).toISOString())
  })

  it('reads the timestamp of a generated ulid', () => {
    const before = Date.now()
    const inspection = inspectId(createUlid())
    expect(inspection.format).toBe('ulid')
    expect(inspection.version).toBeNull()
    expect(inspection.timestampMs).toBeGreaterThanOrEqual(before - 1000)
    expect(inspection.timestampMs).toBeLessThanOrEqual(Date.now() + 1000)
  })

  it('reads a known uuid v7 timestamp', () => {
    const inspection = inspectId('017f22e2-79b0-7cc3-98c4-dc0c0c07398f')
    expect(inspection.iso).toBe('2022-02-22T19:22:22.000Z')
  })

  it('accepts a lowercase ulid', () => {
    const ulid = createUlid()
    expect(inspectId(ulid.toLowerCase()).timestampMs).toBe(inspectId(ulid).timestampMs)
  })

  it('reports an unsupported or invalid input as an error', () => {
    expect(() => inspectId('')).toThrow()
    expect(() => inspectId(createUuidV4())).toThrow(/no timestamp/)
    expect(() => inspectId('not-an-id')).toThrow(/not a UUID v7 or a ULID/)
    // A ULID never holds I, L, O, or U.
    expect(() => inspectId('01ARZ3NDEKTSV4RRFFQ69G5FAI')).toThrow(/not a UUID v7 or a ULID/)
  })

  it('generates ids through createId helper', () => {
    expect(createId('uuidv4')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
    expect(createId('uuidv7')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
    expect(createId('ulid')).toHaveLength(26)
    expect(createId('nanoid', { nanoIdLength: 10 })).toHaveLength(10)
  })
})
