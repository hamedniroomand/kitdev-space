import { describe, expect, it } from 'vitest'
import { formatRelativeTime, parseTimestamp } from '#shared/utils/dev/timestamp'

describe('timestamp utilities', () => {
  it('parses timestamps in seconds', () => {
    const date = parseTimestamp(1700000000)
    expect(date).not.toBeNull()
    expect(date?.toISOString()).toBe('2023-11-14T22:13:20.000Z')
  })

  it('parses string timestamps in seconds', () => {
    const date = parseTimestamp('1700000000')
    expect(date).not.toBeNull()
    expect(date?.toISOString()).toBe('2023-11-14T22:13:20.000Z')
  })

  it('parses timestamps in milliseconds', () => {
    const date = parseTimestamp(1700000000123)
    expect(date).not.toBeNull()
    expect(date?.toISOString()).toBe('2023-11-14T22:13:20.123Z')
  })

  it('parses ISO date strings', () => {
    const date = parseTimestamp('2024-01-01T00:00:00.000Z')
    expect(date).not.toBeNull()
    expect(date?.getTime()).toBe(new Date('2024-01-01T00:00:00.000Z').getTime())
  })

  it('returns null for invalid input', () => {
    expect(parseTimestamp('')).toBeNull()
    expect(parseTimestamp('invalid-date')).toBeNull()
  })

  it('formats relative time with Intl.RelativeTimeFormat', () => {
    const now = new Date('2024-01-01T12:00:00Z')
    const pastMinutes = new Date('2024-01-01T11:55:00Z')
    expect(formatRelativeTime(pastMinutes, now)).toBe('5 minutes ago')

    const futureHours = new Date('2024-01-01T14:00:00Z')
    expect(formatRelativeTime(futureHours, now)).toBe('in 2 hours')
  })
})
