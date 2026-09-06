export type ToolRunStatus = 'idle' | 'processing' | 'success' | 'error'

const DEFAULT_ERROR_MESSAGE = 'The tool failed.'

interface FetchErrorShape {
  data?: { message?: string }
  statusMessage?: string
}

function toErrorMessage(cause: unknown, fallback: string) {
  const fetchError = cause as FetchErrorShape
  if (fetchError?.data?.message) {
    return fetchError.data.message
  }
  if (fetchError?.statusMessage) {
    return fetchError.statusMessage
  }
  if (cause instanceof Error && cause.message) {
    return cause.message
  }
  return fallback
}

export function useTool<TResult = string>() {
  const status = ref<ToolRunStatus>('idle')
  const error = ref<string | null>(null)
  const result = ref<TResult | null>(null)
  const { track } = useToolAnalytics()

  async function run(task: () => Promise<TResult> | TResult, fallbackMessage = DEFAULT_ERROR_MESSAGE) {
    status.value = 'processing'
    error.value = null

    try {
      result.value = await task()
      status.value = 'success'
      track('tool_execute')
    }
    catch (cause) {
      error.value = toErrorMessage(cause, fallbackMessage)
      status.value = 'error'
      track('tool_error')
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
