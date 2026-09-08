import { mount } from '@vue/test-utils'
// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import ToolResultActions from '../../../app/components/tool/ToolResultActions.vue'

// Mock useCurrentToolId
vi.mock('../../../app/composables/useCurrentTool', () => ({
  useCurrentToolId: () => ref('json-formatter'),
}))

vi.mock('../../../app/composables/useToolAnalytics', () => ({
  useToolAnalytics: () => ({
    track: vi.fn(),
  }),
}))

const mockCopy = vi.fn().mockResolvedValue(true)
vi.mock('../../../app/composables/useCopyFeedback', () => ({
  useCopyFeedback: () => ({
    copy: mockCopy,
    label: (_key: string, idle: string) => idle,
    icon: (_key: string, idle: string) => idle,
    color: () => 'neutral',
  }),
}))

const mockDownloadText = vi.fn()
vi.mock('../../../app/composables/useDownload', () => ({
  useDownload: () => ({
    downloadText: mockDownloadText,
  }),
}))

describe('toolResultActions', () => {
  beforeEach(() => {
    mockCopy.mockClear()
    mockDownloadText.mockClear()
  })

  it('renders Copy JSON and Download JSON when result is present', () => {
    const wrapper = mount(ToolResultActions, {
      props: {
        result: { foo: 'bar' },
        input: 'test',
        toolId: 'json-formatter',
      },
      global: {
        stubs: {
          UButton: {
            template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
            props: ['disabled'],
          },
        },
      },
    })

    expect(wrapper.text()).toContain('Copy JSON')
    expect(wrapper.text()).toContain('Download JSON')
    expect(wrapper.text()).toContain('Share')
  })

  it('does not show Share button for secret tools', () => {
    const wrapper = mount(ToolResultActions, {
      props: {
        result: { foo: 'bar' },
        input: 'test',
        toolId: 'aes',
      },
      global: {
        stubs: {
          UButton: {
            template: '<button><slot /></button>',
          },
        },
      },
    })

    expect(wrapper.text()).not.toContain('Share')
  })

  it('disables Share button when input exceeds 8 KB', () => {
    const largeInput = 'x'.repeat(8193)
    const wrapper = mount(ToolResultActions, {
      props: {
        result: { foo: 'bar' },
        input: largeInput,
        toolId: 'json-formatter',
      },
      global: {
        stubs: {
          UButton: {
            template: '<button :disabled="disabled"><slot /></button>',
            props: ['disabled'],
          },
        },
      },
    })

    const shareButton = wrapper.findAll('button').find(b => b.text().includes('Share'))
    expect(shareButton).toBeDefined()
    expect(shareButton?.attributes('disabled')).toBeDefined()
  })

  it('triggers copy with share url on Share button click', async () => {
    const wrapper = mount(ToolResultActions, {
      props: {
        result: { foo: 'bar' },
        input: 'hello world',
        toolId: 'json-formatter',
      },
      global: {
        stubs: {
          UButton: {
            template: '<button :disabled="disabled"><slot /></button>',
            props: ['disabled'],
          },
        },
      },
    })

    const shareButton = wrapper.findAll('button').find(b => b.text().includes('Share'))
    await shareButton?.trigger('click')

    expect(mockCopy).toHaveBeenCalledTimes(1)
    const copiedUrl = mockCopy.mock.calls[0][0]
    expect(copiedUrl).toContain('#input=hello%20world')
  })
})
