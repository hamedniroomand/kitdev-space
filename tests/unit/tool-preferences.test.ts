import { describe, expect, it } from 'vitest'
import { useToolPreferences } from '~/composables/useToolPreferences'

describe('useToolPreferences', () => {
  it('toggles pinned tools correctly', () => {
    const { pinnedIds, togglePin, isPinned } = useToolPreferences()
    pinnedIds.value = []

    expect(isPinned('json-formatter')).toBe(false)
    togglePin('json-formatter')
    expect(isPinned('json-formatter')).toBe(true)
    expect(pinnedIds.value).toContain('json-formatter')

    togglePin('json-formatter')
    expect(isPinned('json-formatter')).toBe(false)
  })

  it('records recent tools and limits max count', () => {
    const { recentIds, recordRecent, clearRecents } = useToolPreferences()
    recentIds.value = []

    recordRecent('tool-1')
    recordRecent('tool-2')
    recordRecent('tool-1')

    expect(recentIds.value).toEqual(['tool-1', 'tool-2'])

    clearRecents()
    expect(recentIds.value).toHaveLength(0)
  })
})
