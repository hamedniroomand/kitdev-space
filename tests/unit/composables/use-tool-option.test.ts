// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useToolOption } from '../../../app/composables/useToolOption'

vi.mock('../../../app/composables/useCurrentTool', () => ({
  useCurrentToolId: () => ref('json-formatter'),
}))

describe('useToolOption', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('stores and retrieves option using kitdev:<toolId>:<option> format', async () => {
    const indent = useToolOption('indent', 2)
    expect(indent.value).toBe(2)

    indent.value = 4
    await nextTick()
    expect(localStorage.getItem('kitdev:json-formatter:indent')).toBe('4')
  })

  it('supports explicit toolId parameter', async () => {
    const mode = useToolOption('mode', 'compact', 'sql-formatter')
    expect(mode.value).toBe('compact')

    mode.value = 'expanded'
    await nextTick()
    expect(localStorage.getItem('kitdev:sql-formatter:mode')).toBe('expanded')
  })

  it('restores existing saved value from localStorage', () => {
    localStorage.setItem('kitdev:json-formatter:sortKeys', 'true')
    const sortKeys = useToolOption('sortKeys', false)
    expect(sortKeys.value).toBe(true)
  })
})
