import type { MaybeRefOrGetter } from 'vue'
import type { RunLocation } from '#shared/utils/analytics/run-location'
import type { ToolRunStatus } from './useTool'
import { watchDebounced } from '@vueuse/core'
import {
  computed,
  isRef,
  ref,
  toValue,
} from 'vue'
import { inputBytesBucket } from '#shared/utils/analytics/buckets'
import { errorKind } from '#shared/utils/analytics/error-kind'
import { useToolAnalytics } from './useToolAnalytics'
import { useToolInput } from './useToolInput'

export interface UseLiveToolOptions {
  debounceMs?: number
  runLocation?: Exclude<RunLocation, 'mixed'>
  option?: MaybeRefOrGetter<string | undefined>
}

/**
 * Track execution and error analytics for tools that compute results live.
 *
 * It evaluates results immediately for fast UI feedback.
 * It sends analytics events only after inputs settle (default 400 ms).
 * It never includes user input, output content, or error messages in analytics parameters.
 */
export function useLiveTool<T>(
  source: MaybeRefOrGetter<T>,
  options: UseLiveToolOptions = {},
) {
  const debounceMs = options.debounceMs ?? 400
  const { track } = useToolAnalytics()
  const { totalInputBytes } = useToolInput()

  const status = ref<ToolRunStatus>('idle')
  const error = ref<string | null>(null)
  const lastError = ref<unknown>(null)
  const lastDuration = ref(0)

  // Safe evaluation wrapper
  const isPlainFunction = typeof source === 'function' && !isRef(source)

  const result = isRef(source)
    ? source
    : computed<T | null>(() => {
        const started = performance.now()
        try {
          const val = toValue(source)
          lastDuration.value = Math.max(0, Math.round(performance.now() - started))
          error.value = null
          lastError.value = null
          status.value = 'success'
          return val
        }
        catch (cause) {
          lastDuration.value = Math.max(0, Math.round(performance.now() - started))
          error.value = cause instanceof Error ? cause.message : 'The tool failed.'
          lastError.value = cause
          status.value = 'error'
          if (!isPlainFunction) {
            throw cause
          }
          return null
        }
      })

  // Watch with debounce
  watchDebounced(
    [result, () => toValue(options.option)],
    () => {
      if (lastError.value) {
        track('tool_error', { error_kind: errorKind(lastError.value) })
        return
      }

      // Check if the result itself has an error property (like { error: ... })
      const val = toValue(result) as any
      if (val && typeof val === 'object' && val.error) {
        track('tool_error', { error_kind: errorKind(val.error) })
        return
      }

      track('tool_execute', {
        duration_ms: lastDuration.value,
        input_bytes_bucket: inputBytesBucket(totalInputBytes()),
        ...(options.runLocation ? { run_location: options.runLocation } : {}),
        ...(options.option ? { option: toValue(options.option) } : {}),
      })
    },
    { debounce: debounceMs },
  )

  return {
    status,
    error,
    result,
  }
}
