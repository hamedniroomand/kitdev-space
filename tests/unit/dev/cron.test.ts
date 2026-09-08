import { describe, expect, it } from 'vitest'
import { describeCron, formatCronRunLocal, nextCronRuns } from '../../../shared/utils/dev/cron'

describe('cron helpers', () => {
  it('describes weekday morning job', () => {
    const text = describeCron('30 9 * * MON-FRI')
    expect(text.toLowerCase()).toContain('9')
    expect(text.length).toBeGreaterThan(10)
  })

  it('returns five next runs', () => {
    const runs = nextCronRuns('0 0 * * *', 5, new Date('2026-01-01T00:00:00.000Z'), 'UTC')
    expect(runs).toHaveLength(5)
    expect(runs[0]).toBe('2026-01-02T00:00:00.000Z')
  })

  it('formats cron run date locally', () => {
    const formatted = formatCronRunLocal('2026-01-01T12:00:00.000Z', 'UTC')
    expect(formatted).toBeDefined()
    expect(formatted.length).toBeGreaterThan(5)
  })

  it('throws error for empty expression', () => {
    expect(() => describeCron('')).toThrow('Enter a cron expression.')
    expect(() => nextCronRuns('')).toThrow('Enter a cron expression.')
  })
})
