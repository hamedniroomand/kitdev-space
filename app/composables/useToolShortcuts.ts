export interface ToolShortcutsOptions {
  onRun?: () => void | Promise<void>
  onCopy?: () => void | Promise<void>
  onClear?: () => void | Promise<void>
}

export function useToolShortcuts(
  optionsOrRun: ToolShortcutsOptions | (() => void | Promise<void>),
) {
  const options = typeof optionsOrRun === 'function' ? { onRun: optionsOrRun } : optionsOrRun

  const shortcuts: Record<string, any> = {}

  if (options.onRun) {
    const run = () => {
      options.onRun?.()
    }
    shortcuts.meta_enter = {
      usingInput: true,
      handler: run,
    }
    shortcuts.ctrl_enter = {
      usingInput: true,
      handler: run,
    }
  }

  if (options.onCopy) {
    const copy = () => {
      options.onCopy?.()
    }
    shortcuts.meta_shift_c = {
      usingInput: true,
      handler: copy,
    }
    shortcuts.ctrl_shift_c = {
      usingInput: true,
      handler: copy,
    }
  }

  defineShortcuts(shortcuts)
}
