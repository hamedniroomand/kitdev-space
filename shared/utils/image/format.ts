import type { ImageEncodeFormat } from './types'

export function imageExtensionFor(format: ImageEncodeFormat): string {
  return format === 'jpeg' ? 'jpg' : format
}
