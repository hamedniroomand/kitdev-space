export function parseTimestamp(input: string | number): Date | null {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) {
      return null
    }
    // Check if input is seconds (< 100 billion) or milliseconds
    const ms = Math.abs(input) < 100_000_000_000 ? input * 1000 : input
    const date = new Date(ms)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }

  // Check if trimmed is pure numeric string
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const num = Number(trimmed)
    if (!Number.isFinite(num)) {
      return null
    }
    const ms = Math.abs(num) < 100_000_000_000 ? num * 1000 : num
    const date = new Date(ms)
    return Number.isNaN(date.getTime()) ? null : date
  }

  // Otherwise parse as date string (e.g. ISO 8601)
  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatRelativeTime(date: Date, baseDate: Date = new Date()): string {
  const diffInSeconds = Math.round((date.getTime() - baseDate.getTime()) / 1000)
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  const absDiff = Math.abs(diffInSeconds)
  if (absDiff < 60) {
    return rtf.format(diffInSeconds, 'second')
  }

  const diffInMinutes = Math.round(diffInSeconds / 60)
  const absMinutes = Math.abs(diffInMinutes)
  if (absMinutes < 60) {
    return rtf.format(diffInMinutes, 'minute')
  }

  const diffInHours = Math.round(diffInMinutes / 60)
  const absHours = Math.abs(diffInHours)
  if (absHours < 24) {
    return rtf.format(diffInHours, 'hour')
  }

  const diffInDays = Math.round(diffInHours / 24)
  const absDays = Math.abs(diffInDays)
  if (absDays < 30) {
    return rtf.format(diffInDays, 'day')
  }

  const diffInMonths = Math.round(diffInDays / 30)
  const absMonths = Math.abs(diffInMonths)
  if (absMonths < 12) {
    return rtf.format(diffInMonths, 'month')
  }

  const diffInYears = Math.round(diffInDays / 365)
  return rtf.format(diffInYears, 'year')
}
