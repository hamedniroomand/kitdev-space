import type { RemovableRef } from '@vueuse/core'
import { useStorage } from '@vueuse/core'
import { useCurrentToolId } from './useCurrentTool'

/**
 * Store tool configuration options and toggles in local storage.
 *
 * It uses the key structure `kitdev:<toolId>:<option>`.
 * Save only enumerated options and configuration toggles.
 * Never use this composable to persist user input data.
 */
export function useToolOption<T>(
  key: string,
  defaultValue: T,
  toolId?: string,
): RemovableRef<T> {
  const currentToolId = useCurrentToolId()
  const resolvedToolId = toolId ?? currentToolId.value ?? 'global'
  const storageKey = `kitdev:${resolvedToolId}:${key}`
  return useStorage<T>(storageKey, defaultValue)
}
