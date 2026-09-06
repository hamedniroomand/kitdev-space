import { whenever, useMagicKeys } from '@vueuse/core'

export interface ToolShortcutsOptions {
  onRun?: () => void
  onCopy?: () => void
  onClear?: () => void
  onSwap?: () => void
}

export function useToolShortcuts(options: ToolShortcutsOptions) {
  const keys = useMagicKeys()

  if (options.onRun) {
    if (keys.Meta_Enter) whenever(keys.Meta_Enter, options.onRun)
    if (keys.Ctrl_Enter) whenever(keys.Ctrl_Enter, options.onRun)
  }

  if (options.onCopy && keys.Alt_C) {
    whenever(keys.Alt_C, options.onCopy)
  }

  if (options.onClear && keys.Alt_X) {
    whenever(keys.Alt_X, options.onClear)
  }

  if (options.onSwap && keys.Alt_S) {
    whenever(keys.Alt_S, options.onSwap)
  }
}
