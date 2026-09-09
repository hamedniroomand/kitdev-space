import { describe, expect, it } from 'vitest'
import { isTrackingParam, stripTrackingParams } from '#shared/utils/network/tracking-params'
import { buildUrlWithParams, parseQueryParams } from '#shared/utils/network/url'

describe('isTrackingParam', () => {
  it.each(['utm_source', 'UTM_Campaign', 'fbclid', 'gclid', 'mc_eid', 'msclkid', 'mtm_medium', 'hsa_acc'])(
    'marks %s as a tracking parameter',
    (key) => {
      expect(isTrackingParam(key)).toBe(true)
    },
  )

  it.each(['ref', 'source', 'id', 'from', 'q', 'page', 'utmost'])(
    'keeps the functional parameter %s',
    (key) => {
      expect(isTrackingParam(key)).toBe(false)
    },
  )
})

describe('stripTrackingParams', () => {
  it('removes the tracking parameters and keeps the other rows', () => {
    const result = stripTrackingParams(parseQueryParams('?q=a+b&utm_source=news&id=7&fbclid=abc'))
    expect(result.params.map(param => param.key)).toEqual(['q', 'id'])
    expect(result.removed).toEqual(['utm_source', 'fbclid'])
  })

  it('keeps the raw text of every parameter that stays', () => {
    const params = stripTrackingParams(parseQueryParams('?q=a+b&gclid=1')).params
    expect(buildUrlWithParams('https://example.com/p?q=a+b&gclid=1', params))
      .toBe('https://example.com/p?q=a+b')
  })

  it('removes the question mark when every parameter is a tracking parameter', () => {
    const params = stripTrackingParams(parseQueryParams('?utm_source=news')).params
    expect(buildUrlWithParams('https://example.com/path?utm_source=news', params))
      .toBe('https://example.com/path')
  })

  it('makes no change when the URL has no tracking parameter', () => {
    const params = parseQueryParams('?q=1&ref=friend')
    expect(stripTrackingParams(params)).toEqual({ params, removed: [] })
  })
})
