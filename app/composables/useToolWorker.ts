import type { ConfigurableWindow } from '@vueuse/core'
import { defaultWindow, useWebWorkerFn } from '@vueuse/core'

export interface ToolWorkerOptions extends ConfigurableWindow {
  /**
   * Execution timeout in milliseconds before the worker terminates.
   * Default: 30_000 ms.
   */
  timeout?: number
  /**
   * External script dependencies to import into the worker.
   */
  dependencies?: string[]
  /**
   * Local function dependencies to pass to useWebWorkerFn.
   */
  localDependencies?: Array<(...args: any[]) => any>
  /**
   * Threshold in characters or bytes above which processing is considered heavy.
   * When input size exceeds this threshold, progress indicators and limits are shown.
   */
  heavyThreshold?: number
}

export function useToolWorker<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn> | TReturn,
  options: ToolWorkerOptions = {},
) {
  const timeout = options.timeout ?? 30_000
  const isRunning = ref(false)
  const isTimedOut = ref(false)
  const isCancelled = ref(false)
  const workerError = ref<string | null>(null)

  const { workerFn, workerStatus, workerTerminate } = useWebWorkerFn(fn, {
    timeout,
    dependencies: options.dependencies,
    localDependencies: options.localDependencies,
    window: options.window ?? defaultWindow,
  })

  function stop() {
    if (isRunning.value) {
      isCancelled.value = true
      workerTerminate('PENDING')
      isRunning.value = false
      workerError.value = 'Operation stopped by user.'
    }
  }

  async function execute(...args: TArgs): Promise<TReturn> {
    isRunning.value = true
    isTimedOut.value = false
    isCancelled.value = false
    workerError.value = null

    try {
      const res = await workerFn(...args)
      return res
    }
    catch (cause: any) {
      if (cause?.message?.includes('timeout') || workerStatus.value === 'TIMEOUT_EXPIRED') {
        isTimedOut.value = true
        workerError.value = `Operation timed out after ${Math.round(timeout / 1000)} seconds.`
        throw new Error(workerError.value)
      }
      if (isCancelled.value) {
        throw new Error('Operation stopped by user.')
      }
      const message = cause instanceof Error ? cause.message : String(cause)
      workerError.value = message
      throw cause
    }
    finally {
      isRunning.value = false
    }
  }

  return {
    execute,
    stop,
    terminate: workerTerminate,
    isRunning: readonly(isRunning),
    isTimedOut: readonly(isTimedOut),
    isCancelled: readonly(isCancelled),
    workerError: readonly(workerError),
    workerStatus,
  }
}
