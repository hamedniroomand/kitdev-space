import { describe, expect, it } from 'vitest'
import {
  analyzeTimestamp,
  describeDuration,
  detectAmbiguousDate,
  detectTimestampUnit,
  epochValues,
  formatInZone,
  formatIso,
} from '#shared/utils/dev/timestamp'

describe('detectTimestampUnit', () => {
  it('reads the exact digit width of each unit', () => {
    expect(detectTimestampUnit('1700000000')).toBe('seconds')
    expect(detectTimestampUnit('1700000000123')).toBe('milliseconds')
    expect(detectTimestampUnit('1700000000123456')).toBe('microseconds')
    expect(detectTimestampUnit('1700000000123456789')).toBe('nanoseconds')
  })

  it('takes the next smaller unit at an ambiguous digit count', () => {
    expect(detectTimestampUnit('12345678901')).toBe('seconds')
    expect(detectTimestampUnit('123456789012')).toBe('milliseconds')
    expect(detectTimestampUnit('12345678901234')).toBe('milliseconds')
    expect(detectTimestampUnit('123456789012345')).toBe('microseconds')
    expect(detectTimestampUnit('12345678901234567')).toBe('microseconds')
    expect(detectTimestampUnit('123456789012345678')).toBe('nanoseconds')
  })

  it('ignores a sign, whitespace, and a fraction', () => {
    expect(detectTimestampUnit('  -1700000000 ')).toBe('seconds')
    expect(detectTimestampUnit('+1700000000')).toBe('seconds')
    expect(detectTimestampUnit('1700000000.123456')).toBe('seconds')
  })

  it('reads a short count as seconds', () => {
    expect(detectTimestampUnit('0')).toBe('seconds')
    expect(detectTimestampUnit('1')).toBe('seconds')
  })
})

describe('analyzeTimestamp', () => {
  it('converts seconds', () => {
    const found = analyzeTimestamp('1700000000')
    expect(found?.unit).toBe('seconds')
    expect(found?.date.toISOString()).toBe('2023-11-14T22:13:20.000Z')
  })

  it('converts milliseconds', () => {
    const found = analyzeTimestamp('1700000000123')
    expect(found?.unit).toBe('milliseconds')
    expect(found?.date.toISOString()).toBe('2023-11-14T22:13:20.123Z')
  })

  it('keeps every nanosecond digit', () => {
    const found = analyzeTimestamp('1700000000123456789')
    expect(found?.unit).toBe('nanoseconds')
    expect(found?.nanoseconds).toBe(1_700_000_000_123_456_789n)
    expect(found?.subMillisecondNs).toBe(456_789)
    expect(formatIso(found!)).toBe('2023-11-14T22:13:20.123456789Z')
  })

  it('keeps every microsecond digit', () => {
    const found = analyzeTimestamp('1700000000123456')
    expect(found?.unit).toBe('microseconds')
    expect(found?.subMillisecondNs).toBe(456_000)
    expect(formatIso(found!)).toBe('2023-11-14T22:13:20.123456000Z')
  })

  it('scales a fraction of the selected unit', () => {
    const found = analyzeTimestamp('1700000000.5', 'seconds')
    expect(found?.nanoseconds).toBe(1_700_000_000_500_000_000n)
    expect(found?.date.toISOString()).toBe('2023-11-14T22:13:20.500Z')
  })

  it('takes an explicit unit over the digit count', () => {
    const found = analyzeTimestamp('1700000000', 'milliseconds')
    expect(found?.unit).toBe('milliseconds')
    expect(found?.date.toISOString()).toBe('1970-01-20T16:13:20.000Z')
  })

  it('converts a negative timestamp before 1970', () => {
    const found = analyzeTimestamp('-1000')
    expect(found?.unit).toBe('seconds')
    expect(found?.date.toISOString()).toBe('1969-12-31T23:43:20.000Z')
    expect(found?.nanoseconds).toBe(-1_000_000_000_000n)
  })

  it('rounds a negative sub-millisecond value down to the lower millisecond', () => {
    const found = analyzeTimestamp('-1500', 'microseconds')
    expect(found?.date.toISOString()).toBe('1969-12-31T23:59:59.998Z')
    expect(found?.subMillisecondNs).toBe(500_000)
    expect(found?.nanoseconds).toBe(-1_500_000n)
  })

  it('accepts a leading plus sign and surrounding whitespace', () => {
    expect(analyzeTimestamp('  +1700000000  ')?.date.toISOString()).toBe('2023-11-14T22:13:20.000Z')
  })

  it('converts epoch zero', () => {
    const found = analyzeTimestamp('0')
    expect(formatIso(found!)).toBe('1970-01-01T00:00:00.000Z')
  })

  it('reads an ISO 8601 date string', () => {
    const found = analyzeTimestamp('2024-01-01T00:00:00.000Z')
    expect(found?.unit).toBeNull()
    expect(found?.ambiguity).toBeNull()
    expect(found?.date.getTime()).toBe(new Date('2024-01-01T00:00:00.000Z').getTime())
  })

  it('returns null for empty and invalid input', () => {
    expect(analyzeTimestamp('')).toBeNull()
    expect(analyzeTimestamp('   ')).toBeNull()
    expect(analyzeTimestamp('invalid-date')).toBeNull()
  })

  it('returns null for a time outside the range of Date', () => {
    expect(analyzeTimestamp('99999999999999999999', 'milliseconds')).toBeNull()
  })

  it('reports the reading it used for an ambiguous date', () => {
    const found = analyzeTimestamp('01/02/2024')
    expect(found?.ambiguity).toEqual({
      monthFirst: '2024-01-02',
      dayFirst: '2024-02-01',
      used: '2024-01-02',
    })
  })

  it('reads an ambiguous date with every separator', () => {
    for (const text of ['01/02/2024', '01-02-2024', '1.2.2024', '01/02/2024 10:30:00']) {
      const found = analyzeTimestamp(text)
      expect(found, text).not.toBeNull()
      expect(found?.ambiguity?.used, text).toBe('2024-01-02')
    }
  })
})

describe('detectAmbiguousDate', () => {
  it('flags a date where both parts can be a month', () => {
    expect(detectAmbiguousDate('01/02/2024')).toEqual({
      monthFirst: '2024-01-02',
      dayFirst: '2024-02-01',
    })
  })

  it('flags the same date with dash and dot separators', () => {
    expect(detectAmbiguousDate('01-02-2024')?.dayFirst).toBe('2024-02-01')
    expect(detectAmbiguousDate('1.2.2024')?.dayFirst).toBe('2024-02-01')
  })

  it('flags a date that carries a time', () => {
    expect(detectAmbiguousDate('01/02/2024 10:30:00')?.monthFirst).toBe('2024-01-02')
  })

  it('does not flag a part above 12', () => {
    expect(detectAmbiguousDate('25/12/2024')).toBeNull()
    expect(detectAmbiguousDate('12/25/2024')).toBeNull()
  })

  it('does not flag an ISO 8601 date', () => {
    expect(detectAmbiguousDate('2024-01-02')).toBeNull()
    expect(detectAmbiguousDate('2024-01-02T10:30:00Z')).toBeNull()
  })

  it('does not flag two equal parts', () => {
    expect(detectAmbiguousDate('01/01/2024')).toBeNull()
  })

  it('does not flag a zero part', () => {
    expect(detectAmbiguousDate('00/02/2024')).toBeNull()
  })
})

describe('epochValues', () => {
  it('gives an exact string in each unit', () => {
    expect(epochValues(1_700_000_000_123_456_789n)).toEqual({
      seconds: '1700000000',
      milliseconds: '1700000000123',
      microseconds: '1700000000123456',
      nanoseconds: '1700000000123456789',
    })
  })

  it('rounds a negative value down', () => {
    expect(epochValues(-1_500_000n).milliseconds).toBe('-2')
    expect(epochValues(-1_500_000n).seconds).toBe('-1')
  })
})

describe('describeDuration', () => {
  it('reports a difference below one second', () => {
    const duration = describeDuration(0, 250)
    expect(duration.milliseconds).toBe(250)
    expect(duration.totalMilliseconds).toBe(250)
    expect(duration.text).toBe('250 milliseconds')
  })

  it('reports an exact whole day', () => {
    const duration = describeDuration(0, 86_400_000)
    expect(duration).toMatchObject({ days: 1, hours: 0, minutes: 0, seconds: 0, milliseconds: 0 })
    expect(duration.text).toBe('1 day')
  })

  it('reports every part of a mixed duration', () => {
    const duration = describeDuration(0, 86_400_000 + 3_600_000 * 2 + 60_000 * 3 + 4000 + 5)
    expect(duration).toMatchObject({ days: 1, hours: 2, minutes: 3, seconds: 4, milliseconds: 5 })
    expect(duration.text).toBe('1 day 2 hours 3 minutes 4 seconds 5 milliseconds')
  })

  it('gives the same result when the second time is earlier', () => {
    expect(describeDuration(86_400_000, 0)).toEqual(describeDuration(0, 86_400_000))
  })

  it('reports zero for two equal times', () => {
    expect(describeDuration(1000, 1000).text).toBe('0 milliseconds')
  })
})

describe('formatInZone', () => {
  it('formats in the requested zone', () => {
    const date = new Date('2024-01-01T12:30:45.000Z')
    expect(formatInZone(date, 'UTC')).toContain('12:30:45')
    expect(formatInZone(date, 'Asia/Tokyo')).toContain('21:30:45')
  })

  it('falls back to ISO 8601 for an unknown zone', () => {
    const date = new Date('2024-01-01T12:30:45.000Z')
    expect(formatInZone(date, 'Not/AZone')).toBe('2024-01-01T12:30:45.000Z')
  })
})
