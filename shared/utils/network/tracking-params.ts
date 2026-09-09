import type { UrlQueryParam } from './url'

/** Marketing and analytics keys. Each key has no function in the page. */
const TRACKING_KEYS = new Set([
  '_ga',
  '_gl',
  '_hsenc',
  '_hsmi',
  'dclid',
  'epik',
  'fbclid',
  'gbraid',
  'gclid',
  'igshid',
  'mc_cid',
  'mc_eid',
  'mkt_tok',
  'msclkid',
  's_kwcid',
  'ttclid',
  'twclid',
  'wbraid',
  'yclid',
])

/** Key starts that belong to one analytics product. */
const TRACKING_PREFIXES = ['utm_', 'pk_', 'mtm_', 'matomo_', 'piwik_', 'hsa_']

/**
 * A key such as `ref`, `source`, or `id` stays. An application can use it,
 * so the tool must not remove it.
 */
export function isTrackingParam(key: string): boolean {
  const name = key.trim().toLowerCase()
  if (!name) {
    return false
  }
  if (TRACKING_KEYS.has(name)) {
    return true
  }
  return TRACKING_PREFIXES.some(prefix => name.startsWith(prefix))
}

export interface StripTrackingResult {
  params: UrlQueryParam[]
  removed: string[]
}

/** Remove the tracking parameters. Each other parameter keeps its raw text and its position. */
export function stripTrackingParams(params: UrlQueryParam[]): StripTrackingResult {
  const kept: UrlQueryParam[] = []
  const removed: string[] = []

  for (const param of params) {
    if (isTrackingParam(param.key)) {
      removed.push(param.key)
    }
    else {
      kept.push(param)
    }
  }

  return { params: kept, removed }
}
