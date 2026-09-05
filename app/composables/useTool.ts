export type ToolRunStatus = 'idle' | 'processing' | 'success' | 'error'

export function useTool<TResult = string>() {
  const status = ref<ToolRunStatus>('idle')
  const error = ref<string | null>(null)
  const result = ref<TResult | null>(null)

  async function run(task: () => Promise<TResult> | TResult) {
    status.value = 'processing'
    error.value = null

    try {
      result.value = await task()
      status.value = 'success'
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'The tool failed.'
      status.value = 'error'
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
    reset
  }
}
