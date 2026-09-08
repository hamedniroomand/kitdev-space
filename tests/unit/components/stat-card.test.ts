import { mount } from '@vue/test-utils'
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import StatCard from '../../../app/components/tool/StatCard.vue'

describe('statCard', () => {
  it('renders label and formatted numeric value', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Words',
        value: 1234,
      },
    })

    expect(wrapper.text()).toContain('Words')
    expect(wrapper.text()).toContain('1,234')
  })

  it('renders string value and unit', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Reading Time',
        value: 5,
        unit: 'min',
        color: 'primary',
      },
    })

    expect(wrapper.text()).toContain('Reading Time')
    expect(wrapper.text()).toContain('5')
    expect(wrapper.text()).toContain('min')
  })

  it('renders description if provided', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Status',
        value: 'OK',
        description: 'All checks passed',
      },
    })

    expect(wrapper.text()).toContain('Status')
    expect(wrapper.text()).toContain('OK')
    expect(wrapper.text()).toContain('All checks passed')
  })
})
