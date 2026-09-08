// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useSqliteStudio } from '../../../app/composables/useSqliteStudio'

const stateMap = new Map<string, any>()
;(globalThis as any).useState = (key: string, init?: () => any) => {
  if (!stateMap.has(key)) {
    stateMap.set(key, ref(init ? init() : undefined))
  }
  return stateMap.get(key)
}

;(globalThis as any).useDownload = () => ({
  downloadBlob: vi.fn(),
  downloadText: vi.fn(),
})

;(globalThis as any).useToolInput = () => ({
  reportInput: vi.fn(),
})

;(globalThis as any).useSessionStorage = (_key: string, initial: any) => ref(initial)

describe('useSqliteStudio handoff', () => {
  beforeEach(() => {
    stateMap.clear()
  })

  it('uses default query when no handoff query is present', () => {
    const { activeQuery, isCustomQuery } = useSqliteStudio()
    expect(activeQuery.value).toBe('SELECT * FROM products LIMIT 100;')
    expect(isCustomQuery.value).toBe(false)
  })

  it('receives handoff query in memory and clears handoff state', () => {
    const handoffState = (globalThis as any).useState('kitdev:sqlite:handoff-query', () => '')
    handoffState.value = 'SELECT id, username FROM users WHERE active = 1;'

    const { activeQuery, isCustomQuery } = useSqliteStudio()
    expect(activeQuery.value).toBe('SELECT id, username FROM users WHERE active = 1;')
    expect(isCustomQuery.value).toBe(true)
    expect(handoffState.value).toBe('')
  })
})
