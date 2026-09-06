import { computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { getToolById } from '~~/shared/utils/tools'
import type { Tool } from '../types/tools'

export function useToolPreferences() {
  const pinnedIds = useStorage<string[]>('kitdev:pinned-tools', [])
  const recentIds = useStorage<string[]>('kitdev:recent-tools', [])

  function togglePin(toolId: string) {
    const index = pinnedIds.value.indexOf(toolId)
    if (index === -1) {
      pinnedIds.value.push(toolId)
    } else {
      pinnedIds.value.splice(index, 1)
    }
  }

  function isPinned(toolId: string): boolean {
    return pinnedIds.value.includes(toolId)
  }

  function recordRecent(toolId: string) {
    const filtered = recentIds.value.filter(id => id !== toolId)
    filtered.unshift(toolId)
    // Keep max 8 recent tools
    recentIds.value = filtered.slice(0, 8)
  }

  function clearRecents() {
    recentIds.value = []
  }

  const pinnedTools = computed<Tool[]>(() => {
    return pinnedIds.value
      .map(id => getToolById(id))
      .filter((t): t is Tool => Boolean(t))
  })

  const recentTools = computed<Tool[]>(() => {
    return recentIds.value
      .map(id => getToolById(id))
      .filter((t): t is Tool => Boolean(t))
  })

  return {
    pinnedIds,
    recentIds,
    pinnedTools,
    recentTools,
    togglePin,
    isPinned,
    recordRecent,
    clearRecents
  }
}
