import type { CropAspectId, ImagePresetId } from './types'

export const PRESET_SIZES: Record<ImagePresetId, { width: number, height: number }> = {
  'twitter-banner': { width: 1500, height: 500 },
  'instagram-square': { width: 1080, height: 1080 },
  'open-graph': { width: 1200, height: 630 },
  'favicon': { width: 32, height: 32 },
}

/** The fixed crop shapes. The ratio is the width divided by the height. */
export const CROP_ASPECTS: { label: string, value: CropAspectId, ratio: number }[] = [
  { label: 'Square (1:1)', value: '1:1', ratio: 1 },
  { label: 'Wide (16:9)', value: '16:9', ratio: 16 / 9 },
  { label: 'Standard (4:3)', value: '4:3', ratio: 4 / 3 },
  { label: 'Photo (3:2)', value: '3:2', ratio: 3 / 2 },
]
