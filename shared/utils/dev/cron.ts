import { CronExpressionParser } from 'cron-parser'
import cronstrue from 'cronstrue'

export function describeCron(expression: string): string {
  const text = expression.trim()
  if (!text) {
    throw new Error('Enter a cron expression.')
  }
  return cronstrue.toString(text, { throwExceptionOnParseError: true })
}

export function nextCronRuns(
  expression: string,
  count = 5,
  from: Date = new Date(),
  timeZone = 'UTC',
): string[] {
  const text = expression.trim()
  if (!text) {
    throw new Error('Enter a cron expression.')
  }
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw new Error('Count must be an integer from 1 to 20.')
  }
  if (Number.isNaN(from.getTime())) {
    throw new TypeError('Enter a valid start time.')
  }

  const tz = timeZone.trim() || 'UTC'
  const interval = CronExpressionParser.parse(text, {
    currentDate: from,
    tz,
  })

  const runs: string[] = []
  for (let i = 0; i < count; i++) {
    if (!interval.hasNext()) {
      break
    }
    const next = interval.next()
    const iso = next ? (next.toISOString ? next.toISOString() : new Date(next.toString()).toISOString()) : null
    if (iso) {
      runs.push(iso)
    }
  }

  if (runs.length === 0) {
    throw new Error('No upcoming runs were found for this expression.')
  }

  return runs
}

export function formatCronRunLocal(iso: string, timeZone: string): string {
  const date = new Date(iso)
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timeZone || 'UTC',
      dateStyle: 'medium',
      timeStyle: 'short',
      weekday: 'short',
    }).format(date)
  }
  catch {
    return iso
  }
}
