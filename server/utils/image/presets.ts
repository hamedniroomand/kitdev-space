import type { ImagePresetId } from '../../../shared/utils/image/types'

export const IMAGE_PRESETS: Record<ImagePresetId, { width: number, height: number, label: string }> = {
  'twitter-banner': { width: 1500, height: 500, label: 'Twitter Banner' },
  'instagram-square': { width: 1080, height: 1080, label: 'Instagram Square' },
  'open-graph': { width: 1200, height: 630, label: 'OpenGraph' },
  'favicon': { width: 32, height: 32, label: 'Favicon' }
}
