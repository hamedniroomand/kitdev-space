import type { ImagePresetId } from './types'

export const PRESET_SIZES: Record<ImagePresetId, { width: number, height: number }> = {
  'twitter-banner': { width: 1500, height: 500 },
  'instagram-square': { width: 1080, height: 1080 },
  'open-graph': { width: 1200, height: 630 },
  'favicon': { width: 32, height: 32 },
}
