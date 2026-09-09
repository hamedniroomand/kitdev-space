import { describe, expect, it } from 'vitest'
import { ianaTimeZones, isValidTimeZone } from '#shared/utils/time-zones'

describe('ianaTimeZones', () => {
  it('puts UTC first and lists it one time', () => {
    const zones = ianaTimeZones()
    expect(zones[0]).toBe('UTC')
    expect(zones.filter(zone => zone === 'UTC')).toHaveLength(1)
  })
})

describe('isValidTimeZone', () => {
  it('accepts a real zone and refuses an invented one', () => {
    expect(isValidTimeZone('UTC')).toBe(true)
    expect(isValidTimeZone('America/New_York')).toBe(true)
    expect(isValidTimeZone('Not/AZone')).toBe(false)
  })
})
