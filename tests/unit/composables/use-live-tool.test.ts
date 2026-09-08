// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useLiveTool } from '../../../app/composables/useLiveTool'

const mockTrack = vi.fn()
vi.mock('../../../app/composables/useToolAnalytics', () => ({
  useToolAnalytics: () => ({
    track: mockTrack,
  }),
}))

vi.mock('../../../app/composables/useCurrentTool', () => ({
  useCurrentToolId: () => ref('text-stats'),
}))

vi.mock('../../../app/composables/useToolInput', () => ({
  useToolInput: () => ({
    totalInputBytes: () => 42,
  }),
}))

describe('useLiveTool', () => {
  beforeEach(() => {
    mockTrack.mockClear()
    vi.useFakeTimers()
  })

  it('does not send events on immediate raw change', () => {
    const input = ref('hello')
    useLiveTool(() => input.value.toUpperCase())

    expect(mockTrack).not.toHaveBeenCalled()

    input.value = 'hello world'
    expect(mockTrack).not.toHaveBeenCalled()
  })

  it('sends exactly one tool_execute event after 400ms debounce settles', async () => {
    const input = ref('hello')
    const { result } = useLiveTool(() => input.value.toUpperCase())

    expect(result.value).toBe('HELLO')

    // Simulate rapid typing
    input.value = 'h'
    vi.advanceTimersByTime(100)
    input.value = 'he'
    vi.advanceTimersByTime(100)
    input.value = 'hel'
    vi.advanceTimersByTime(100)
    input.value = 'hell'
    vi.advanceTimersByTime(100)
    input.value = 'hello!'

    // Still within debounce interval
    expect(mockTrack).not.toHaveBeenCalled()

    // Settle after 400 ms
    await vi.advanceTimersByTimeAsync(400)

    expect(mockTrack).toHaveBeenCalledTimes(1)
    expect(mockTrack).toHaveBeenCalledWith('tool_execute', expect.objectContaining({
      input_bytes_bucket: '0-1k',
    }))

    // Parameter privacy check: input text must not be in params
    const params = mockTrack.mock.calls[0][1]
    expect(JSON.stringify(params)).not.toContain('hello!')
  })

  it('sends tool_error when computation throws an error', async () => {
    const input = ref('valid')
    useLiveTool(() => {
      if (input.value === 'invalid') {
        throw new Error('Invalid syntax')
      }
      return input.value
    })

    input.value = 'invalid'
    await vi.advanceTimersByTimeAsync(400)

    expect(mockTrack).toHaveBeenCalledTimes(1)
    expect(mockTrack).toHaveBeenCalledWith('tool_error', expect.objectContaining({
      error_kind: 'unknown',
    }))

    // Parameter privacy check: error message must not be in params
    const params = mockTrack.mock.calls[0][1]
    expect(JSON.stringify(params)).not.toContain('Invalid syntax')
  })
})
