import { mount } from '@vue/test-utils'
// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ImageResult from '../../../app/components/image/ImageResult.vue'

const mockDownloadBlob = vi.fn()
vi.mock('../../../app/composables/useDownload', () => ({
  useDownload: () => ({
    downloadBlob: mockDownloadBlob,
  }),
}))

vi.mock('@vueuse/core', () => ({
  useObjectUrl: (fn: () => Blob | null | undefined) => {
    const val = fn()
    return { value: val ? 'blob:mock-url' : null }
  },
}))

describe('imageResult', () => {
  beforeEach(() => {
    mockDownloadBlob.mockClear()
  })

  it('renders nothing when no blob is provided', () => {
    const wrapper = mount(ImageResult, {
      props: {
        blob: null,
      },
    })
    expect(wrapper.text()).toBe('')
  })

  it('renders result image and download button', () => {
    const blob = new Blob(['sample'], { type: 'image/webp' })
    const wrapper = mount(ImageResult, {
      props: {
        blob,
        width: 800,
        height: 600,
      },
      global: {
        stubs: {
          UButton: {
            props: ['label'],
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('Image Result')
    expect(wrapper.text()).toContain('800 × 600')
    expect(wrapper.find('button').text()).toContain('Download')
  })

  it('calculates size saved delta correctly', () => {
    const blob = new Blob(['result'], { type: 'image/webp' })
    const wrapper = mount(ImageResult, {
      props: {
        blob,
        inputBytes: 1000,
        outputBytes: 400,
      },
      global: {
        stubs: {
          UButton: {
            template: '<button><slot /></button>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('Saved 60%')
  })

  it('triggers download when download button clicked', async () => {
    const blob = new Blob(['result'], { type: 'image/webp' })
    const wrapper = mount(ImageResult, {
      props: {
        blob,
        filename: 'custom.webp',
      },
      global: {
        stubs: {
          UButton: {
            template: '<button><slot /></button>',
          },
        },
      },
    })

    const btn = wrapper.find('button')
    await btn.trigger('click')

    expect(mockDownloadBlob).toHaveBeenCalledWith('custom.webp', blob)
    expect(wrapper.emitted('download')).toHaveLength(1)
  })
})
