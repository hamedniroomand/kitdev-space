const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

function fieldLabel(value: string, kind: 'minute' | 'hour' | 'day' | 'month' | 'weekday'): string {
  if (value === '*') {
    return `every ${kind}`
  }
  if (kind === 'weekday') {
    return `weekday ${value}`
  }
  return `${kind} ${value}`
}

export function describeCron(expression: string): string {
  const text = expression.trim()
  if (!text) {
    throw new Error('Enter a cron expression.')
  }

  // Validate with Bun first.
  Bun.cron.parse(text, Date.now(), { tz: 'UTC' })

  const nicknames: Record<string, string> = {
    '@yearly': 'Once a year at midnight on 1 January.',
    '@annually': 'Once a year at midnight on 1 January.',
    '@monthly': 'Once a month at midnight on day 1.',
    '@weekly': 'Once a week at midnight on Sunday.',
    '@daily': 'Once a day at midnight.',
    '@midnight': 'Once a day at midnight.',
    '@hourly': 'Once an hour at minute 0.'
  }

  if (nicknames[text.toLowerCase()]) {
    return nicknames[text.toLowerCase()]!
  }

  const parts = text.split(/\s+/)
  if (parts.length !== 5) {
    throw new Error('Enter a 5-field cron expression (minute hour day month weekday).')
  }

  const [minute, hour, day, month, weekday] = parts
  return [
    fieldLabel(minute!, 'minute'),
    fieldLabel(hour!, 'hour'),
    fieldLabel(day!, 'day'),
    fieldLabel(month!, 'month'),
    fieldLabel(weekday!, 'weekday')
  ].join('; ') + '.'
}

export function nextCronRuns(
  expression: string,
  count: number,
  from: Date,
  timeZone: string
): string[] {
  const text = expression.trim()
  if (!text) {
    throw new Error('Enter a cron expression.')
  }
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw new Error('Count must be an integer from 1 to 20.')
  }
  if (Number.isNaN(from.getTime())) {
    throw new Error('Enter a valid start time.')
  }

  const tz = timeZone.trim() || 'UTC'
  const runs: string[] = []
  let cursor = from

  // ponytail: Bun.cron.parse returns the next Date; advance by 1ms to walk the timeline.
  for (let i = 0; i < count; i++) {
    const next = Bun.cron.parse(text, cursor, { tz })
    if (!(next instanceof Date) || Number.isNaN(next.getTime())) {
      break
    }
    runs.push(next.toISOString())
    cursor = new Date(next.getTime() + 1)
  }

  if (runs.length === 0) {
    throw new Error('No upcoming runs were found for this expression.')
  }

  return runs
}

export function formatCronRunLocal(iso: string, timeZone: string): string {
  const date = new Date(iso)
  const weekday = WEEKDAYS[date.getUTCDay()]
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timeZone || 'UTC',
      dateStyle: 'medium',
      timeStyle: 'short',
      weekday: 'short'
    }).format(date)
  } catch {
    return `${weekday} ${iso}`
  }
}
