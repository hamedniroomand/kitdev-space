// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'
import {
  isSecretTool,
  MAX_SHARE_INPUT_BYTES,
  SECRET_TOOL_IDS,
  useToolQuery,
} from '../../../app/composables/useToolQuery'

// Mock useCurrentToolId and useToolInput if needed
vi.mock('../../../app/composables/useCurrentTool', () => ({
  useCurrentToolId: () => ref('json-formatter'),
}))

const mockReportInput = vi.fn()
vi.mock('../../../app/composables/useToolInput', () => ({
  useToolInput: () => ({
    reportInput: mockReportInput,
  }),
}))

describe('useToolQuery', () => {
  beforeEach(() => {
    window.location.href = 'https://kitdev.space/hub/data/json-formatter'
    window.location.hash = ''
    mockReportInput.mockClear()
  })

  it('identifies secret tools correctly', () => {
    for (const id of SECRET_TOOL_IDS) {
      expect(isSecretTool(id)).toBe(true)
    }
    expect(isSecretTool('json-formatter')).toBe(false)
    expect(isSecretTool('text-diff')).toBe(false)
    expect(isSecretTool(null)).toBe(false)
  })

  it('refuses to build share links for secret tools', () => {
    const { buildShareUrl, canShare } = useToolQuery({
      toolId: 'aes',
      input: ref('secret text'),
    })
    expect(canShare.value).toBe(false)
    expect(buildShareUrl()).toBeNull()
  })

  it('refuses to build share links when input exceeds 8 KB', () => {
    const largeInput = 'a'.repeat(MAX_SHARE_INPUT_BYTES + 1)
    const { buildShareUrl, canShare } = useToolQuery({
      toolId: 'json-formatter',
      input: ref(largeInput),
    })
    expect(canShare.value).toBe(false)
    expect(buildShareUrl()).toBeNull()
  })

  it('builds share link with options in query and input in hash', () => {
    const options = reactive({ indent: '4', sort: 'true' })
    const input = ref('{"hello":"world"}')
    const { buildShareUrl, canShare } = useToolQuery({
      toolId: 'json-formatter',
      options,
      input,
    })

    expect(canShare.value).toBe(true)
    const shareUrl = buildShareUrl()
    expect(shareUrl).toBeDefined()
    expect(shareUrl).not.toBeNull()

    const url = new URL(shareUrl!)
    // Options in query
    expect(url.searchParams.get('indent')).toBe('4')
    expect(url.searchParams.get('sort')).toBe('true')
    // Input NOT in query
    expect(url.searchParams.get('input')).toBeNull()
    // Input in hash
    expect(url.hash).toBe('#input=%7B%22hello%22%3A%22world%22%7D')
  })

  it('restores input from URL hash and reports url input method', () => {
    const rawInput = '{"test":123}'
    window.location.hash = `#input=${encodeURIComponent(rawInput)}`
    const input = ref('')

    const { restoreInputFromHash } = useToolQuery({
      toolId: 'json-formatter',
      input,
    })

    const restored = restoreInputFromHash()
    expect(restored).toBe(true)
    expect(input.value).toBe(rawInput)
    expect(mockReportInput).toHaveBeenCalledWith('url')
  })

  it('restores input from raw URL hash without input= prefix', () => {
    const rawInput = 'plain input text'
    window.location.hash = `#${encodeURIComponent(rawInput)}`
    const input = ref('')

    const { restoreInputFromHash } = useToolQuery({
      toolId: 'json-formatter',
      input,
    })

    const restored = restoreInputFromHash()
    expect(restored).toBe(true)
    expect(input.value).toBe(rawInput)
    expect(mockReportInput).toHaveBeenCalledWith('url')
  })
})
