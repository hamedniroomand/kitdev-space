import type { ImageEncodeFormat } from '#shared/utils/image/types'
import type { ImageResult } from './pipeline'
import { getImageMetadata, processImage } from './pipeline'

/** Formats that Bun can write. Any other input becomes a PNG, which has no loss. */
const KEEP_FORMAT: Record<string, ImageEncodeFormat> = {
  jpeg: 'jpeg',
  jpg: 'jpeg',
  png: 'png',
  webp: 'webp',
  avif: 'avif',
}

/**
 * Removes every metadata block by a re-encode. Bun writes no EXIF, XMP, IPTC,
 * or text block, so the output holds pixels only. A JPEG or an AVIF loses a
 * little quality in the re-encode. A PNG and a WebP stay lossless.
 */
export async function cleanImageMetadata(bytes: Uint8Array): Promise<ImageResult> {
  const meta = await getImageMetadata(bytes)
  const format = KEEP_FORMAT[meta.format.toLowerCase()] ?? 'png'
  return processImage(bytes, { format, quality: 92, lossless: format === 'webp' })
}
