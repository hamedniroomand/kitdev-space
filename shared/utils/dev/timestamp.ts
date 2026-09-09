export type TimestampUnit = 'seconds' | 'milliseconds' | 'microseconds' | 'nanoseconds'

/** How many nanoseconds one unit holds, as a power of ten. */
const NANOSECOND_EXPONENT: Record<TimestampUnit, number> = {
  seconds: 9,
  milliseconds: 6,
  microseconds: 3,
  nanoseconds: 0,
}

const NANOSECONDS_PER_UNIT: Record<TimestampUnit, bigint> = {
  seconds: 1_000_000_000n,
  milliseconds: 1_000_000n,
  microseconds: 1_000n,
  nanoseconds: 1n,
}

/** An integer or a decimal number, with an optional sign. */
const NUMERIC_INPUT = /^([+-]?)(\d+)(?:\.(\d+))?$/

/** A date with two numeric parts before a four digit year, such as `01/02/2024`. */
const NUMERIC_DATE = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/

const MILLISECONDS_PER_DAY = 86_400_000

export interface AmbiguousDate {
  /** The reading that puts the month first, as `YYYY-MM-DD`. */
  monthFirst: string
  /** The reading that puts the day first, as `YYYY-MM-DD`. */
  dayFirst: string
  /** The reading that the parser selected, as `YYYY-MM-DD`. */
  used: string
}

export interface TimestampAnalysis {
  date: Date
  /** The unit of a numeric input. It is `null` for a date string. */
  unit: TimestampUnit | null
  /** The exact time since the epoch, in nanoseconds. */
  nanoseconds: bigint
  /** The part below one millisecond, in nanoseconds. It is 0 to 999999. */
  subMillisecondNs: number
  ambiguity: AmbiguousDate | null
}

export interface TimestampDuration {
  days: number
  hours: number
  minutes: number
  seconds: number
  milliseconds: number
  totalMilliseconds: number
  /** The duration in words, such as `2 days 3 hours`. */
  text: string
}

/** BigInt division truncates towards zero. A date needs the lower millisecond. */
function floorDivide(value: bigint, divisor: bigint): bigint {
  const quotient = value / divisor
  if (value >= 0n || value % divisor === 0n) {
    return quotient
  }
  return quotient - 1n
}

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0')
}

/**
 * The unit of a numeric timestamp, from the digit count of its whole part.
 *
 * The exact widths are 10 for seconds, 13 for milliseconds, 16 for
 * microseconds, and 19 for nanoseconds. A count between two widths is
 * ambiguous, so the ranges are 11 digits or less for seconds, 12 to 14 for
 * milliseconds, 15 to 17 for microseconds, and 18 or more for nanoseconds.
 */
export function detectTimestampUnit(input: string): TimestampUnit {
  const whole = input.trim().replace(/^[+-]/, '').split('.')[0] ?? ''
  const digits = whole.length
  if (digits <= 11) {
    return 'seconds'
  }
  if (digits <= 14) {
    return 'milliseconds'
  }
  if (digits <= 17) {
    return 'microseconds'
  }
  return 'nanoseconds'
}

/** The local date of a `Date`, as `YYYY-MM-DD`. */
export function localIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * The two readings of a numeric date, or `null` when the date has one reading.
 *
 * `01/02/2024` is 2 January and also 1 February. A part above 12 can only be a
 * day, and an ISO 8601 date starts with a four digit year, so both are exact.
 */
export function detectAmbiguousDate(input: string): Omit<AmbiguousDate, 'used'> | null {
  const datePart = input.trim().split(/[T\s]/)[0] ?? ''
  const match = NUMERIC_DATE.exec(datePart)
  if (!match) {
    return null
  }

  const first = Number(match[1])
  const second = Number(match[2])
  const year = match[3]
  if (first < 1 || second < 1 || first > 12 || second > 12 || first === second) {
    return null
  }

  return {
    monthFirst: `${year}-${pad(first)}-${pad(second)}`,
    dayFirst: `${year}-${pad(second)}-${pad(first)}`,
  }
}

function fromNanoseconds(nanoseconds: bigint, unit: TimestampUnit): TimestampAnalysis | null {
  const milliseconds = floorDivide(nanoseconds, 1_000_000n)
  const date = new Date(Number(milliseconds))
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return {
    date,
    unit,
    nanoseconds,
    subMillisecondNs: Number(nanoseconds - milliseconds * 1_000_000n),
    ambiguity: null,
  }
}

/**
 * Read a Unix timestamp or a date string.
 *
 * A numeric input keeps its full precision, because nanoseconds since the
 * epoch are above `Number.MAX_SAFE_INTEGER`. Set `unit` to `auto` to take the
 * unit from the digit count.
 */
export function analyzeTimestamp(
  input: string,
  unit: TimestampUnit | 'auto' = 'auto',
): TimestampAnalysis | null {
  const text = input.trim()
  if (!text) {
    return null
  }

  const numeric = NUMERIC_INPUT.exec(text)
  if (numeric) {
    const whole = numeric[2] ?? '0'
    const fraction = numeric[3] ?? ''
    const resolved = unit === 'auto' ? detectTimestampUnit(whole) : unit
    const exponent = NANOSECOND_EXPONENT[resolved]
    const scaled = BigInt(whole + fraction.slice(0, exponent).padEnd(exponent, '0'))
    return fromNanoseconds(numeric[1] === '-' ? -scaled : scaled, resolved)
  }

  const date = new Date(text)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  const readings = detectAmbiguousDate(text)
  return {
    date,
    unit: null,
    nanoseconds: BigInt(date.getTime()) * 1_000_000n,
    subMillisecondNs: 0,
    ambiguity: readings ? { ...readings, used: localIsoDate(date) } : null,
  }
}

/** The time since the epoch in each unit, as exact decimal strings. */
export function epochValues(nanoseconds: bigint): Record<TimestampUnit, string> {
  return {
    seconds: String(floorDivide(nanoseconds, NANOSECONDS_PER_UNIT.seconds)),
    milliseconds: String(floorDivide(nanoseconds, NANOSECONDS_PER_UNIT.milliseconds)),
    microseconds: String(floorDivide(nanoseconds, NANOSECONDS_PER_UNIT.microseconds)),
    nanoseconds: String(nanoseconds),
  }
}

/** ISO 8601 in UTC. It keeps the nanosecond digits when the input has them. */
export function formatIso(analysis: TimestampAnalysis): string {
  const iso = analysis.date.toISOString()
  if (analysis.subMillisecondNs === 0) {
    return iso
  }
  return iso.replace('Z', `${pad(analysis.subMillisecondNs, 6)}Z`)
}

/** The date and the time in an IANA timezone, with seconds. */
export function formatInZone(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timeZone || 'UTC',
      dateStyle: 'medium',
      timeStyle: 'long',
      hour12: false,
    }).format(date)
  }
  catch {
    return date.toISOString()
  }
}

/** The IANA zones of the platform, with UTC first. `Intl` omits UTC. */

/** The distance between two times. The order of the two times has no effect. */
export function describeDuration(fromMs: number, toMs: number): TimestampDuration {
  const total = Math.abs(toMs - fromMs)
  const parts = {
    days: Math.floor(total / MILLISECONDS_PER_DAY),
    hours: Math.floor(total / 3_600_000) % 24,
    minutes: Math.floor(total / 60_000) % 60,
    seconds: Math.floor(total / 1000) % 60,
    milliseconds: total % 1000,
  }

  const words = Object.entries(parts)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => `${value} ${value === 1 ? name.slice(0, -1) : name}`)

  return {
    ...parts,
    totalMilliseconds: total,
    text: words.length > 0 ? words.join(' ') : '0 milliseconds',
  }
}
