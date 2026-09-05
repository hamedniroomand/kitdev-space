import { useClipboard as useBrowserClipboard } from '@vueuse/core'

export function useClipboard() {
  const { copy: copyText, copied, isSupported } = useBrowserClipboard()

  async function copy(text: string): Promise<boolean> {
    if (!isSupported.value) {
      return false
    }

    try {
      await copyText(text)
      return true
    } catch {
      return false
    }
  }

  return {
    copy,
    copied,
    isSupported
  }
}
