import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useToolShortcuts } from '../../../app/composables/useToolShortcuts'

const mockDefineShortcuts = vi.fn()
vi.stubGlobal('defineShortcuts', mockDefineShortcuts)

describe('useToolShortcuts', () => {
  beforeEach(() => {
    mockDefineShortcuts.mockClear()
  })

  it('registers meta_enter and ctrl_enter when passed a function', () => {
    const onRun = vi.fn()
    useToolShortcuts(onRun)

    expect(mockDefineShortcuts).toHaveBeenCalledTimes(1)
    const shortcuts = mockDefineShortcuts.mock.calls[0][0]
    expect(shortcuts.meta_enter).toBeDefined()
    expect(shortcuts.ctrl_enter).toBeDefined()
    expect(shortcuts.meta_enter.usingInput).toBe(true)

    shortcuts.meta_enter.handler()
    expect(onRun).toHaveBeenCalledTimes(1)

    shortcuts.ctrl_enter.handler()
    expect(onRun).toHaveBeenCalledTimes(2)
  })

  it('registers meta_enter, ctrl_enter, and copy shortcuts with options object', () => {
    const onRun = vi.fn()
    const onCopy = vi.fn()
    useToolShortcuts({ onRun, onCopy })

    expect(mockDefineShortcuts).toHaveBeenCalledTimes(1)
    const shortcuts = mockDefineShortcuts.mock.calls[0][0]
    expect(shortcuts.meta_enter).toBeDefined()
    expect(shortcuts.ctrl_enter).toBeDefined()
    expect(shortcuts.meta_shift_c).toBeDefined()
    expect(shortcuts.ctrl_shift_c).toBeDefined()

    shortcuts.meta_shift_c.handler()
    expect(onCopy).toHaveBeenCalledTimes(1)

    shortcuts.ctrl_shift_c.handler()
    expect(onCopy).toHaveBeenCalledTimes(2)
  })
})
