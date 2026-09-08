import { mount } from '@vue/test-utils'
// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ToolResultRow from '../../../app/components/tool/ToolResultRow.vue'

const mockCopy = vi.fn().mockResolvedValue(true)
vi.mock('../../../app/composables/useCopyFeedback', () => ({
  useCopyFeedback: () => ({
    copy: mockCopy,
    label: (_key: string, idle: string) => idle ?? 'Copy',
    icon: (_key: string, idle: string) => idle ?? 'i-lucide-copy',
    color: () => 'neutral',
  }),
}))

describe('toolResultRow', () => {
  beforeEach(() => {
    mockCopy.mockClear()
  })

  it('renders label and value', () => {
    const wrapper = mount(ToolResultRow, {
      props: {
        label: 'camelCase',
        value: 'helloWorld',
      },
      global: {
        stubs: {
          UButton: {
            props: ['label', 'disabled'],
            template: '<button :disabled="disabled">{{ label }}</button>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('camelCase')
    expect(wrapper.text()).toContain('helloWorld')
  })

  it('renders dash when value is empty', () => {
    const wrapper = mount(ToolResultRow, {
      props: {
        label: 'snake_case',
        value: '',
      },
      global: {
        stubs: {
          UButton: {
            props: ['label', 'disabled'],
            template: '<button :disabled="disabled">{{ label }}</button>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('—')
    const btn = wrapper.find('button')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('copies value when copy button is clicked', async () => {
    const wrapper = mount(ToolResultRow, {
      props: {
        label: 'kebab-case',
        value: 'hello-world',
      },
      global: {
        stubs: {
          UButton: {
            props: ['label', 'disabled'],
            template: '<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
          },
        },
      },
    })

    const btn = wrapper.find('button')
    await btn.trigger('click')

    expect(mockCopy).toHaveBeenCalledWith('hello-world', 'kebab-case')
    expect(wrapper.emitted('copy')?.[0]).toEqual(['hello-world'])
  })

  it('uses copyValue prop when specified instead of value', async () => {
    const wrapper = mount(ToolResultRow, {
      props: {
        label: 'Custom',
        value: 'Displayed Text',
        copyValue: 'raw-copy-value',
      },
      global: {
        stubs: {
          UButton: {
            props: ['label', 'disabled'],
            template: '<button :disabled="disabled" @click="$emit(\'click\')">{{ label }}</button>',
          },
        },
      },
    })

    const btn = wrapper.find('button')
    await btn.trigger('click')

    expect(mockCopy).toHaveBeenCalledWith('raw-copy-value', 'Custom')
    expect(wrapper.emitted('copy')?.[0]).toEqual(['raw-copy-value'])
  })
})
