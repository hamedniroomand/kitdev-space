export type ActionFeedbackTone = 'idle' | 'success' | 'error'

export type FeedbackColor = 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'

export interface ActionFeedbackFace {
  label: string
  icon: string
  color: FeedbackColor
  variant?: 'solid' | 'outline' | 'soft' | 'subtle' | 'ghost' | 'link'
}

const DEFAULT_DURATION_MS = 2000

export function useActionFeedback(options: {
  idle: ActionFeedbackFace
  success: ActionFeedbackFace
  error?: ActionFeedbackFace
  durationMs?: number
}) {
  const state = ref<ActionFeedbackTone>('idle')
  const duration = options.durationMs ?? DEFAULT_DURATION_MS
  const { start, stop } = useTimeoutFn(() => {
    state.value = 'idle'
  }, duration, { immediate: false })

  function flash(next: Exclude<ActionFeedbackTone, 'idle'>) {
    state.value = next
    stop()
    start()
  }

  function flashSuccess() {
    flash('success')
  }

  function flashError() {
    flash('error')
  }

  function reset() {
    stop()
    state.value = 'idle'
  }

  const face = computed(() => {
    if (state.value === 'success') {
      return options.success
    }
    if (state.value === 'error') {
      return options.error ?? {
        label: 'Failed',
        icon: 'i-lucide-x',
        color: 'error' as const,
        variant: options.idle.variant
      }
    }
    return options.idle
  })

  const label = computed(() => face.value.label)
  const icon = computed(() => face.value.icon)
  const color = computed((): FeedbackColor => face.value.color)
  const variant = computed(() => face.value.variant ?? options.idle.variant ?? 'subtle')

  return reactive({
    state,
    label,
    icon,
    color,
    variant,
    flashSuccess,
    flashError,
    reset
  })
}

export function useCopyFeedback(durationMs = DEFAULT_DURATION_MS) {
  const { copy: write, copied } = useClipboard({
    legacy: true,
    copiedDuring: durationMs
  })
  const activeKey = ref<string | null>(null)
  const failed = ref(false)
  const { start, stop } = useTimeoutFn(() => {
    activeKey.value = null
    failed.value = false
  }, durationMs, { immediate: false })

  async function copy(text: MaybeRefOrGetter<string>, key = 'default') {
    const value = toValue(text)
    if (!value) {
      return false
    }

    await write(value)
    activeKey.value = key
    failed.value = !copied.value
    stop()
    start()
    return copied.value
  }

  function isKey(key = 'default') {
    return activeKey.value === key
  }

  function label(key = 'default', idle = 'Copy') {
    if (!isKey(key)) {
      return idle
    }
    return failed.value ? 'Copy failed' : 'Copied'
  }

  function icon(key = 'default', idle = 'i-lucide-copy') {
    if (!isKey(key)) {
      return idle
    }
    return failed.value ? 'i-lucide-x' : 'i-lucide-check'
  }

  function color(key = 'default', idle: FeedbackColor = 'neutral'): FeedbackColor {
    if (!isKey(key)) {
      return idle
    }
    return failed.value ? 'error' : 'success'
  }

  return {
    copy,
    label,
    icon,
    color,
    isKey,
    failed,
    activeKey
  }
}
