import { mount } from '@vue/test-utils'
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import ToolToolbar from '../../../app/components/tool/ToolToolbar.vue'

describe('toolToolbar', () => {
  it('renders default buttons in order: Sample, Copy, Download, Share, Clear', () => {
    const wrapper = mount(ToolToolbar, {
      global: {
        stubs: {
          UButton: {
            props: ['label', 'disabled', 'icon', 'color', 'variant'],
            template: '<button :disabled="disabled" :data-label="label">{{ label }}</button>',
          },
        },
      },
    })

    const buttons = wrapper.findAll('button')
    expect(buttons.map(b => b.attributes('data-label'))).toEqual([
      'Sample',
      'Copy',
      'Download',
      'Share',
      'Clear',
    ])
  })

  it('emits events when buttons are clicked', async () => {
    const wrapper = mount(ToolToolbar, {
      global: {
        stubs: {
          UButton: {
            props: ['label', 'disabled'],
            template: '<button :disabled="disabled" :data-label="label">{{ label }}</button>',
          },
        },
      },
    })

    const sampleBtn = wrapper.find('button[data-label="Sample"]')
    await sampleBtn.trigger('click')
    expect(wrapper.emitted('sample')).toHaveLength(1)

    const copyBtn = wrapper.find('button[data-label="Copy"]')
    await copyBtn.trigger('click')
    expect(wrapper.emitted('copy')).toHaveLength(1)

    const downloadBtn = wrapper.find('button[data-label="Download"]')
    await downloadBtn.trigger('click')
    expect(wrapper.emitted('download')).toHaveLength(1)

    const shareBtn = wrapper.find('button[data-label="Share"]')
    await shareBtn.trigger('click')
    expect(wrapper.emitted('share')).toHaveLength(1)

    const clearBtn = wrapper.find('button[data-label="Clear"]')
    await clearBtn.trigger('click')
    expect(wrapper.emitted('clear')).toHaveLength(1)
  })

  it('hides buttons when hide props are true', () => {
    const wrapper = mount(ToolToolbar, {
      props: {
        hideSample: true,
        hideShare: true,
      },
      global: {
        stubs: {
          UButton: {
            props: ['label'],
            template: '<button :data-label="label">{{ label }}</button>',
          },
        },
      },
    })

    const labels = wrapper.findAll('button').map(b => b.attributes('data-label'))
    expect(labels).not.toContain('Sample')
    expect(labels).not.toContain('Share')
    expect(labels).toEqual(['Copy', 'Download', 'Clear'])
  })

  it('disables buttons when can props are false', () => {
    const wrapper = mount(ToolToolbar, {
      props: {
        canCopy: false,
        canDownload: false,
      },
      global: {
        stubs: {
          UButton: {
            props: ['label', 'disabled'],
            template: '<button :disabled="disabled" :data-label="label">{{ label }}</button>',
          },
        },
      },
    })

    const copyBtn = wrapper.find('button[data-label="Copy"]')
    expect(copyBtn.attributes('disabled')).toBeDefined()

    const downloadBtn = wrapper.find('button[data-label="Download"]')
    expect(downloadBtn.attributes('disabled')).toBeDefined()

    const clearBtn = wrapper.find('button[data-label="Clear"]')
    expect(clearBtn.attributes('disabled')).toBeUndefined()
  })
})
