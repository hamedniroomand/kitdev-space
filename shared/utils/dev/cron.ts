import { CronExpressionParser } from 'cron-parser'
import cronstrue from 'cronstrue'

/** `cron-parser` rejects this alias, so the tool expands it. */
const MIDNIGHT = /^@midnight$/i

/** A startup schedule has no calendar run, so `cron-parser` cannot read it. */
const REBOOT = /^@reboot$/i

/**
 * `cron-parser` reports a day that no requested month holds with this message.
 * The expression is valid, but the schedule never runs.
 */
const IMPOSSIBLE_DAY = 'Invalid explicit day of month definition'

export interface CronScheduleOptions {
  count?: number
  /** A string is read in `timeZone`. A `Date` is an absolute time. */
  from?: Date | string
  timeZone?: string
}

export interface CronSchedule {
  description: string
  /** ISO 8601 times, in ascending order. Empty when the schedule never runs. */
  runs: string[]
  neverRuns: boolean
  runsAtStartup: boolean
}

/** The IANA zones of the platform, with UTC first. `Intl` omits UTC. */
export function cronTimeZones(): string[] {
  const zones = typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : []
  return ['UTC', ...zones.filter(zone => zone !== 'UTC')]
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    return Boolean(new Intl.DateTimeFormat('en', { timeZone }))
  }
  catch {
    return false
  }
}

export function normalizeCron(expression: string): string {
  const text = expression.trim()
  if (!text) {
    throw new Error('Enter a cron expression.')
  }
  return MIDNIGHT.test(text) ? '0 0 * * *' : text
}

export function describeCron(expression: string): string {
  const text = normalizeCron(expression)
  if (REBOOT.test(text)) {
    return 'Runs one time, at startup.'
  }
  try {
    return cronstrue.toString(text, {
      throwExceptionOnParseError: true,
      use24HourTimeFormat: true,
    })
  }
  catch (cause) {
    // `cronstrue` throws an error with no message for an expression it cannot read.
    const message = cause instanceof Error ? cause.message : ''
    throw new Error(message || 'The cron expression is not valid.')
  }
}

export function nextCronRuns(
  expression: string,
  count = 5,
  from: Date | string = new Date(),
  timeZone = 'UTC',
): string[] {
  const text = normalizeCron(expression)
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw new Error('Count must be an integer from 1 to 20.')
  }
  const tz = timeZone.trim() || 'UTC'
  if (!isValidTimeZone(tz)) {
    throw new Error('Select a valid timezone.')
  }
  // A share link can hold a start date that is not valid. `cron-parser` reports
  // it with an internal message, so the check happens here.
  if (Number.isNaN(new Date(from).getTime())) {
    throw new TypeError('Enter a valid start time.')
  }

  try {
    const interval = CronExpressionParser.parse(text, { currentDate: from, tz })
    const runs: string[] = []
    while (runs.length < count && interval.hasNext()) {
      runs.push(interval.next().toDate().toISOString())
    }
    return runs
  }
  catch (cause) {
    if (cause instanceof Error && cause.message.includes(IMPOSSIBLE_DAY)) {
      return []
    }
    throw cause
  }
}

/**
 * Read an expression and calculate its next runs.
 *
 * It throws for an expression that is not valid. It reports a schedule that
 * can never run with `neverRuns`, because such an expression is still valid.
 */
export function analyzeCron(
  expression: string,
  options: CronScheduleOptions = {},
): CronSchedule {
  const text = normalizeCron(expression)
  if (REBOOT.test(text)) {
    return {
      description: describeCron(text),
      runs: [],
      neverRuns: false,
      runsAtStartup: true,
    }
  }

  // The runs come first, because `cron-parser` gives the clearer error message.
  const runs = nextCronRuns(
    text,
    options.count ?? 5,
    options.from ?? new Date(),
    options.timeZone ?? 'UTC',
  )
  return {
    description: describeCron(text),
    runs,
    neverRuns: runs.length === 0,
    runsAtStartup: false,
  }
}

export function formatCronRunLocal(iso: string, timeZone: string): string {
  const date = new Date(iso)
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timeZone || 'UTC',
      dateStyle: 'medium',
      timeStyle: 'short',
      hour12: false,
    }).format(date)
  }
  catch {
    return iso
  }
}
