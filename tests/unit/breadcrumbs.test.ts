import { describe, expect, it } from 'vitest'
import {
  buildCategoryBreadcrumbs,
  buildToolBreadcrumbs,
  hubCategoryPath
} from '../../shared/utils/breadcrumbs'
import { getToolById } from '../../shared/utils/tools'

describe('breadcrumbs', () => {
  it('builds hub category paths', () => {
    expect(hubCategoryPath('data')).toBe('/hub/data')
    expect(hubCategoryPath('crypto')).toBe('/hub/crypto')
  })

  it('builds category breadcrumbs', () => {
    expect(buildCategoryBreadcrumbs('data')).toEqual([
      { label: 'Home', to: '/' },
      { label: 'Hub', to: '/hub' },
      { label: 'Data Lab' }
    ])
  })

  it('builds tool breadcrumbs', () => {
    const tool = getToolById('json-formatter')
    expect(tool).toBeDefined()
    expect(buildToolBreadcrumbs(tool!)).toEqual([
      { label: 'Home', to: '/' },
      { label: 'Hub', to: '/hub' },
      { label: 'Data Lab', to: '/hub/data' },
      { label: 'JSON Formatter' }
    ])
  })
})
