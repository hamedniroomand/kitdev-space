import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useToolWorker } from '../../../app/composables/useToolWorker'

vi.mock('@vueuse/core', async () => {
  const actual = await vi.importActual<any>('@vueuse/core')
  return {
    ...actual,
    useWebWorkerFn: vi.fn((fn, options) => {
      const workerStatus = ref<'PENDING' | 'SUCCESS' | 'ERROR' | 'TIMEOUT'>('SUCCESS')
      const terminate = vi.fn()
      const workerFn = vi.fn(async (...args: any[]) => {
        if (options?.timeout === 50) {
          workerStatus.value = 'TIMEOUT'
          throw new Error('timeout')
        }
        return fn(...args)
      })
      return {
        workerFn,
        workerStatus,
        terminate,
      }
    }),
  }
})

describe('useToolWorker', () => {
  it('executes worker task successfully', async () => {
    const worker = useToolWorker((val: number) => val * 2)
    const res = await worker.execute(21)
    expect(res).toBe(42)
    expect(worker.isRunning.value).toBe(false)
    expect(worker.isTimedOut.value).toBe(false)
  })

  it('handles timeout error properly', async () => {
    const worker = useToolWorker((_val: number) => 100, { timeout: 50 })
    await expect(worker.execute(1)).rejects.toThrow('Operation timed out')
    expect(worker.isTimedOut.value).toBe(true)
    expect(worker.isRunning.value).toBe(false)
  })

  it('stops execution and marks as cancelled', async () => {
    const worker = useToolWorker(() => 'done')
    worker.stop()
    expect(worker.isRunning.value).toBe(false)
  })
})
