import type { InputMethod } from './useToolAnalytics'

/**
 * Tracks how a user puts input into the open tool and how large that input is.
 *
 * `reportInput` sends `tool_input` once per method per tool page. `reportBytes`
 * records the size of each input control, so `useTool.run` can send a size
 * bucket without every caller passing the input. The state is one module-level
 * record per browser tab, and it resets when the open tool changes.
 */
let seenTool: string | null = null
const seenMethods = new Set<InputMethod>()
const bytesBySource = new Map<string, number>()

function resetForTool(tool: string | null) {
  if (tool === seenTool) {
    return
  }
  seenTool = tool
  seenMethods.clear()
  bytesBySource.clear()
}

export function useToolInput() {
  const { track } = useToolAnalytics()
  const currentToolId = useCurrentToolId()

  function reportInput(method: InputMethod) {
    resetForTool(currentToolId.value)
    if (!currentToolId.value || seenMethods.has(method)) {
      return
    }
    seenMethods.add(method)
    track('tool_input', { method })
  }

  function reportBytes(source: string, bytes: number) {
    resetForTool(currentToolId.value)
    bytesBySource.set(source, bytes)
  }

  function clearBytes(source: string) {
    bytesBySource.delete(source)
  }

  function totalInputBytes(): number {
    let total = 0
    for (const bytes of bytesBySource.values()) {
      total += bytes
    }
    return total
  }

  return { reportInput, reportBytes, clearBytes, totalInputBytes }
}
