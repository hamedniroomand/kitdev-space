import { describe, expect, it } from 'vitest'
import {
  analyzeCron,
  describeCron,
  formatCronRunLocal,
  nextCronRuns,
  normalizeCron,
} from '../../../shared/utils/dev/cron'

/** A fixed instant, so a run list never depends on the clock. */
const FROM = new Date('2026-01-01T00:00:00.000Z')

/** New York keeps a daylight saving time shift, so the DST tests use it. */
const NY = 'America/New_York'

function localTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    dateStyle: 'short',
    timeStyle: 'short',
    hour12: false,
  }).format(new Date(iso))
}

describe('cron plain-words descriptions', () => {
  it.each([
    ['30 9 * * MON-FRI', 'At 09:30, Monday through Friday'],
    ['0 22 * * 1-5', 'At 22:00, Monday through Friday'],
    ['5 4 * * SUN', 'At 04:05, only on Sunday'],
    ['15 14 1 * *', 'At 14:15, on day 1 of the month'],
    ['*/15 * * * *', 'Every 15 minutes'],
    ['*/5 1 * * *', 'Every 5 minutes, between 01:00 and 01:59'],
    ['0 9-17 * * *', 'Every hour, between 09:00 and 17:00'],
    ['0 4 8-14 * *', 'At 04:00, between day 8 and 14 of the month'],
    ['0 0 1,15 * *', 'At 00:00, on day 1 and 15 of the month'],
    [
      '23 0-20/2 * * *',
      'At 23 minutes past the hour, every 2 hours, between 00:00 and 20:59',
    ],
    [
      '0 0,12 1 */2 *',
      'At 00:00 and 12:00, on day 1 of the month, every 2 months',
    ],
    ['0 0 * * 6#3', 'At 00:00, on the third Saturday of the month'],
    ['0 0 L * *', 'At 00:00, on the last day of the month'],
    ['0 0 * * 5L', 'At 00:00, on the last Friday of the month'],
    ['@hourly', 'Every hour'],
    ['@daily', 'At 00:00'],
    ['@midnight', 'At 00:00'],
    ['@weekly', 'At 00:00, only on Sunday'],
    ['@monthly', 'At 00:00, on day 1 of the month'],
    ['@yearly', 'At 00:00, on day 1 of the month, only in January'],
  ])('describes %s', (expression, expected) => {
    expect(describeCron(expression)).toBe(expected)
  })

  it('describes a startup schedule, which has no clock time', () => {
    expect(describeCron('@reboot')).toBe('Runs one time, at startup.')
  })

  it('reports a readable error for an expression it cannot read', () => {
    expect(() => describeCron('abc')).toThrow(/not valid|alias/i)
    expect(() => describeCron('')).toThrow('Enter a cron expression.')
  })

  it('expands the @midnight alias, which cron-parser rejects', () => {
    expect(normalizeCron('@midnight')).toBe('0 0 * * *')
    expect(normalizeCron(' 0 0 * * * ')).toBe('0 0 * * *')
  })
})

describe('cron next runs', () => {
  it('returns the requested number of runs', () => {
    const runs = nextCronRuns('0 0 * * *', 5, FROM, 'UTC')
    expect(runs).toHaveLength(5)
    expect(runs[0]).toBe('2026-01-02T00:00:00.000Z')
  })

  it('supports 1 to 20 runs and rejects anything else', () => {
    expect(nextCronRuns('0 0 * * *', 1, FROM, 'UTC')).toHaveLength(1)
    expect(nextCronRuns('0 0 * * *', 20, FROM, 'UTC')).toHaveLength(20)
    expect(() => nextCronRuns('0 0 * * *', 0, FROM, 'UTC')).toThrow(
      'Count must be an integer from 1 to 20.',
    )
    expect(() => nextCronRuns('0 0 * * *', 21, FROM, 'UTC')).toThrow(
      'Count must be an integer from 1 to 20.',
    )
  })

  it('calculates the run in the given timezone, not in the machine timezone', () => {
    const runs = nextCronRuns('0 12 * * *', 1, FROM, NY)
    expect(runs[0]).toBe('2026-01-01T17:00:00.000Z')
    expect(localTime(runs[0]!, NY)).toBe('01/01/2026, 12:00')
  })

  it('reads a start date string in the selected timezone', () => {
    // 02:00 in New York is after 01:30, so the next run is on the day after.
    expect(nextCronRuns('30 1 * * *', 1, '2026-06-10T02:00', NY)[0]).toBe(
      '2026-06-11T05:30:00.000Z',
    )
    expect(nextCronRuns('30 1 * * *', 1, '2026-06-10T00:00', NY)[0]).toBe(
      '2026-06-10T05:30:00.000Z',
    )
  })

  it('rejects a timezone that the platform does not know', () => {
    expect(() => nextCronRuns('0 0 * * *', 5, FROM, 'Not/AZone')).toThrow(
      'Select a valid timezone.',
    )
  })

  it('rejects a start date that is not valid', () => {
    expect(() => nextCronRuns('0 0 * * *', 5, new Date('bad'), 'UTC')).toThrow(
      'Enter a valid start time.',
    )
    // A share link can carry this value.
    expect(() => nextCronRuns('0 0 * * *', 5, 'garbage', 'UTC')).toThrow(
      'Enter a valid start time.',
    )
  })

  it('rejects an expression that is not valid', () => {
    expect(() => nextCronRuns('61 * * * *', 5, FROM, 'UTC')).toThrow(/61/)
    expect(() => nextCronRuns('abc', 5, FROM, 'UTC')).toThrow(/alias/i)
  })

  it('formats a run for a column of a table', () => {
    expect(formatCronRunLocal('2026-01-01T12:00:00.000Z', 'UTC')).toBe(
      '1 Jan 2026, 12:00',
    )
    expect(formatCronRunLocal('2026-01-01T12:00:00.000Z', 'Not/AZone')).toBe(
      '2026-01-01T12:00:00.000Z',
    )
  })
})

describe('cron daylight saving time transitions', () => {
  // New York moves to daylight saving time on 8 March 2026 at 02:00.
  it('moves a daily run forward when the wall clock hour does not exist', () => {
    const runs = nextCronRuns('30 2 * * *', 4, '2026-03-06T00:00', NY)
    expect(runs.map(iso => localTime(iso, NY))).toEqual([
      '06/03/2026, 02:30',
      '07/03/2026, 02:30',
      // 02:30 does not exist on 8 March, so the run moves to 03:30.
      '08/03/2026, 03:30',
      '09/03/2026, 02:30',
    ])
    expect(runs[2]).toBe('2026-03-08T07:30:00.000Z')
  })

  it('skips the missing hour of an hourly schedule and does not repeat a run', () => {
    const runs = nextCronRuns('0 * * * *', 4, '2026-03-08T01:00', NY)
    expect(runs.map(iso => localTime(iso, NY))).toEqual([
      '08/03/2026, 03:00',
      '08/03/2026, 04:00',
      '08/03/2026, 05:00',
      '08/03/2026, 06:00',
    ])
    // The absolute times stay one hour apart, so no interval is lost.
    expect(runs[0]).toBe('2026-03-08T07:00:00.000Z')
    expect(runs[1]).toBe('2026-03-08T08:00:00.000Z')
  })

  // New York returns to standard time on 1 November 2026 at 02:00.
  it('runs a daily schedule one time on the day the clock goes back', () => {
    const runs = nextCronRuns('30 1 * * *', 4, '2026-10-30T00:00', NY)
    expect(runs.map(iso => localTime(iso, NY))).toEqual([
      '30/10/2026, 01:30',
      '31/10/2026, 01:30',
      '01/11/2026, 01:30',
      '02/11/2026, 01:30',
    ])
    // One run only, in daylight saving time. The repeated 01:30 is not used.
    expect(runs[2]).toBe('2026-11-01T05:30:00.000Z')
  })

  it('runs an hourly schedule two times in the hour that repeats', () => {
    const runs = nextCronRuns('0 * * * *', 4, '2026-11-01T00:30', NY)
    expect(runs.map(iso => localTime(iso, NY))).toEqual([
      '01/11/2026, 01:00',
      // The same wall clock hour, one hour later.
      '01/11/2026, 01:00',
      '01/11/2026, 02:00',
      '01/11/2026, 03:00',
    ])
    expect(runs[0]).toBe('2026-11-01T05:00:00.000Z')
    expect(runs[1]).toBe('2026-11-01T06:00:00.000Z')
  })

  it('keeps UTC free of a time shift', () => {
    const runs = nextCronRuns('30 2 * * *', 3, '2026-03-06T00:00', 'UTC')
    expect(runs).toEqual([
      '2026-03-06T02:30:00.000Z',
      '2026-03-07T02:30:00.000Z',
      '2026-03-08T02:30:00.000Z',
    ])
  })
})

describe('cron impossible schedules', () => {
  it.each([
    ['0 0 31 2 *'],
    ['0 0 30 2 *'],
    ['0 0 31 4 *'],
    ['0 0 31 4,6 *'],
    ['0 0 30,31 2 *'],
  ])('reports %s as a schedule that never runs', (expression) => {
    const schedule = analyzeCron(expression, { from: FROM, timeZone: 'UTC' })
    expect(schedule.neverRuns).toBe(true)
    expect(schedule.runs).toEqual([])
    // The expression is valid, so it keeps a description.
    expect(schedule.description).toContain('of the month')
  })

  it('keeps a rare but possible date', () => {
    const schedule = analyzeCron('0 0 29 2 *', { from: FROM, timeZone: 'UTC' })
    expect(schedule.neverRuns).toBe(false)
    expect(schedule.runs[0]).toBe('2028-02-29T00:00:00.000Z')
  })

  it('keeps a schedule that a weekday field rescues', () => {
    // Cron joins the day of month field and the weekday field with OR.
    const schedule = analyzeCron('0 0 31 2 MON', { from: FROM, timeZone: 'UTC' })
    expect(schedule.neverRuns).toBe(false)
    expect(schedule.runs[0]).toBe('2026-02-02T00:00:00.000Z')
  })

  it('reports an expression that cron-parser cannot read as an error', () => {
    // cronstrue reads `15W`, but cron-parser does not. It is not a never-runs
    // schedule, so the tool must show an error.
    expect(() => analyzeCron('0 0 15W * *', { from: FROM })).toThrow(/15W/)
  })

  it('reports a startup schedule apart from a schedule that never runs', () => {
    const schedule = analyzeCron('@reboot')
    expect(schedule.runsAtStartup).toBe(true)
    expect(schedule.neverRuns).toBe(false)
    expect(schedule.runs).toEqual([])
  })

  it('gives a description and the runs together', () => {
    const schedule = analyzeCron('30 9 * * MON-FRI', {
      count: 3,
      from: FROM,
      timeZone: 'UTC',
    })
    expect(schedule.description).toBe('At 09:30, Monday through Friday')
    expect(schedule.runs).toHaveLength(3)
    expect(schedule.neverRuns).toBe(false)
  })
})
