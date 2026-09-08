// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { ref } from 'vue'
import {
  TABLE_VIEWER_HANDOFF_KEY,
  useTableViewerHandoff,
} from '../../../app/composables/useTableViewerHandoff'

const stateMap = new Map<string, any>()
;(globalThis as any).useState = (key: string, init?: () => any) => {
  if (!stateMap.has(key)) {
    stateMap.set(key, ref(init ? init() : null))
  }
  return stateMap.get(key)
}

describe('useTableViewerHandoff', () => {
  beforeEach(() => {
    stateMap.clear()
  })

  it('returns null when no handoff data is set', () => {
    const { consumeHandoffData } = useTableViewerHandoff()
    expect(consumeHandoffData()).toBeNull()
  })

  it('sets and consumes handoff data in memory and clears state', () => {
    const { setHandoffData, consumeHandoffData, handoffState } = useTableViewerHandoff()

    const sampleData = 'id,name,role\n1,Ada,Engineer'
    setHandoffData(sampleData)

    expect(handoffState.value).toBe(sampleData)
    expect(consumeHandoffData()).toBe(sampleData)
    expect(handoffState.value).toBeNull()
    expect(consumeHandoffData()).toBeNull()
  })

  it('uses constant TABLE_VIEWER_HANDOFF_KEY', () => {
    expect(TABLE_VIEWER_HANDOFF_KEY).toBe('kitdev:table:handoff-data')
  })
})
