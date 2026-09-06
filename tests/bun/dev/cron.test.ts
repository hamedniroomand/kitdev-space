import { describe, expect, it } from 'bun:test'
import { describeCron, nextCronRuns } from '#server/utils/dev/cron'

describe('cron helpers', () => {
  it('describes weekday morning job', () => {
    const text = describeCron('30 9 * * MON-FRI')
    expect(text.toLowerCase()).toContain('9')
    expect(text.length).toBeGreaterThan(10)
  })

  it('returns five next runs', () => {
    const runs = nextCronRuns('0 0 * * *', 5, new Date('2026-01-01T00:00:00.000Z'), 'UTC')
    expect(runs).toHaveLength(5)
  })
})
