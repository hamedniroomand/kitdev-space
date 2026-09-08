import type { RunLocation } from '#shared/utils/analytics/run-location'
import { inputBytesBucket } from '#shared/utils/analytics/buckets'
import { errorKind } from '#shared/utils/analytics/error-kind'

export type ToolRunStatus = 'idle' | 'processing' | 'success' | 'error'

/** Analytics facts about one run. Every value must come from a fixed list. */
export interface ToolRunOptions {
  /** The path a tool with a browser path and a server path took for this run. */
  runLocation?: Exclude<RunLocation, 'mixed'>
  /** The enumerated choice of the user, such as a hash algorithm or a target format. */
  option?: string
}

const DEFAULT_ERROR_MESSAGE = 'The tool failed.'

interface FetchErrorShape {
  data?: { message?: string }
  statusMessage?: string
}

function toErrorMessage(cause: unknown, fallback: string) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'Network connection is unavailable. Connect to the internet to run this tool.'
  }
  const fetchError = cause as FetchErrorShape
  if (fetchError?.data?.message) {
    return fetchError.data.message
  }
  if (fetchError?.statusMessage) {
    return fetchError.statusMessage
  }
  if (cause instanceof Error && cause.message) {
    if (/Failed to fetch|NetworkError|fetch failed/i.test(cause.message)) {
      return 'Network connection is unavailable. Connect to the internet to run this tool.'
    }
    return cause.message
  }
  return fallback
}

export function useTool<TResult = string>() {
  const status = ref<ToolRunStatus>('idle')
  const error = ref<string | null>(null)
  const result = ref<TResult | null>(null)
  const { track } = useToolAnalytics()
  const { totalInputBytes } = useToolInput()

  async function run(
    task: () => Promise<TResult> | TResult,
    fallbackMessage = DEFAULT_ERROR_MESSAGE,
    options: ToolRunOptions = {},
  ) {
    status.value = 'processing'
    error.value = null
    const started = performance.now()

    try {
      result.value = await task()
      status.value = 'success'
      track('tool_execute', {
        duration_ms: Math.round(performance.now() - started),
        input_bytes_bucket: inputBytesBucket(totalInputBytes()),
        ...(options.runLocation ? { run_location: options.runLocation } : {}),
        ...(options.option ? { option: options.option } : {}),
      })
    }
    catch (cause) {
      error.value = toErrorMessage(cause, fallbackMessage)
      status.value = 'error'
      // The kind comes from the error shape. The message can hold user input and never leaves the page.
      track('tool_error', { error_kind: errorKind(cause) })
    }
  }

  function reset() {
    status.value = 'idle'
    error.value = null
    result.value = null
  }

  return {
    status,
    error,
    result,
    run,
    reset,
  }
}
