import type {
  ImageEncodeFormat,
  ImageFilter,
  ImageFit,
} from '#shared/utils/image/types'
import { ImageError } from './errors'
import { MAX_PIXELS } from './limits'
import { isSvgBytes, rasterizeSvg } from './svg'

export interface ImageResult {
  bytes: Uint8Array
  mime: string
  width: number
  height: number
}

export interface ImageMetadata {
  width: number
  height: number
  format: string
}

function normalizeInput(input: Uint8Array): Uint8Array {
  if (!isSvgBytes(input)) {
    return input
  }
  return rasterizeSvg(input)
}

function createPipeline(input: Uint8Array) {
  return new Bun.Image(normalizeInput(input), { maxPixels: MAX_PIXELS, autoOrient: true })
}

function mimeFor(format: ImageEncodeFormat): string {
  return format === 'jpeg' ? 'image/jpeg' : `image/${format}`
}

export function mapImageCause(cause: unknown, fallback: string): ImageError {
  if (cause instanceof ImageError) {
    return cause
  }

  const code = (cause as { code?: string })?.code
  if (code === 'ERR_IMAGE_UNKNOWN_FORMAT') {
    return new ImageError(
      'This file type is not supported.\n\nUse JPEG, PNG, WebP, GIF, BMP, TIFF, HEIC, AVIF, or SVG.',
      { cause },
    )
  }
  if (code === 'ERR_IMAGE_FORMAT_UNSUPPORTED') {
    return new ImageError(
      'This image format is not supported on this server.\n\nTry WebP, JPEG, or PNG.',
      { cause },
    )
  }

  return new ImageError(fallback, { cause })
}

function applyFormat(img: Bun.Image, format: ImageEncodeFormat, quality = 80, lossless = false) {
  switch (format) {
    case 'webp':
      return img.webp({ quality, lossless })
    case 'avif':
      return img.avif({ quality })
    case 'jpeg':
      return img.jpeg({ quality })
    case 'png':
      return img.png()
  }
}

async function finish(
  img: ReturnType<typeof applyFormat>,
  format: ImageEncodeFormat,
): Promise<ImageResult> {
  try {
    const bytes = await img.bytes()
    return {
      bytes,
      mime: mimeFor(format),
      width: img.width,
      height: img.height,
    }
  }
  catch (cause) {
    throw mapImageCause(
      cause,
      'The image operation failed.\n\nCheck the file and try again.',
    )
  }
}

function clampQuality(quality?: number): number {
  if (quality == null) {
    return 80
  }
  if (!Number.isFinite(quality) || quality < 1 || quality > 100) {
    throw new ImageError('Quality must be a number from 1 to 100.')
  }
  return Math.round(quality)
}

export async function getImageMetadata(input: Uint8Array): Promise<ImageMetadata> {
  try {
    const meta = await createPipeline(input).metadata()
    return {
      width: meta.width,
      height: meta.height,
      format: String(meta.format),
    }
  }
  catch (cause) {
    throw mapImageCause(
      cause,
      'The image could not be read.\n\nCheck the file and try again.',
    )
  }
}

const SVG_SCALES = new Set([1, 2, 4])

export async function convertSvgAtScale(
  input: Uint8Array,
  opts: { scale: number, format: 'png' | 'webp', quality?: number },
): Promise<ImageResult> {
  if (!SVG_SCALES.has(opts.scale)) {
    throw new ImageError('Choose a scale of 1, 2, or 4.')
  }
  if (!isSvgBytes(input)) {
    throw new ImageError('Provide valid SVG input.')
  }

  try {
    const png = rasterizeSvg(input, { scale: opts.scale })
    const quality = clampQuality(opts.quality)
    const img = applyFormat(
      new Bun.Image(png, { maxPixels: MAX_PIXELS, autoOrient: true }),
      opts.format,
      quality,
    )
    return await finish(img, opts.format)
  }
  catch (cause) {
    throw mapImageCause(
      cause,
      'The SVG convert operation failed.\n\nCheck the input and try again.',
    )
  }
}

export interface ImageProcessOptions {
  width?: number
  height?: number
  fit?: ImageFit
  withoutEnlargement?: boolean
  filter?: ImageFilter
  rotate?: 90 | 180 | 270
  flip?: boolean
  flop?: boolean
  grayscale?: boolean
  format?: ImageEncodeFormat
  quality?: number
  /** WebP only. Keeps every pixel, at the cost of a larger file. */
  lossless?: boolean
}

/**
 * Runs every image operation in one pass, then encodes once.
 *
 * The order is rotate, mirror, resize, grayscale, encode. Rotation comes first,
 * so the width and the height apply to the final image.
 */
export async function processImage(
  input: Uint8Array,
  opts: ImageProcessOptions,
): Promise<ImageResult> {
  const format = opts.format ?? 'webp'
  const quality = clampQuality(opts.quality)
  const resizes = opts.width != null && opts.height != null

  if (resizes) {
    if (!Number.isInteger(opts.width) || opts.width! < 1 || opts.width! > 8192) {
      throw new ImageError('Width must be an integer from 1 to 8192.')
    }
    if (!Number.isInteger(opts.height) || opts.height! < 1 || opts.height! > 8192) {
      throw new ImageError('Height must be an integer from 1 to 8192.')
    }
  }

  try {
    // An SVG has no pixels, so rasterize it at the size that the user asked for.
    const bytes = isSvgBytes(input)
      ? (resizes
          ? rasterizeSvg(input, { width: opts.width, height: opts.height })
          : rasterizeSvg(input))
      : input

    let img = new Bun.Image(bytes, { maxPixels: MAX_PIXELS, autoOrient: true })

    if (opts.rotate) {
      img = img.rotate(opts.rotate)
    }
    if (opts.flip) {
      img = img.flip()
    }
    if (opts.flop) {
      img = img.flop()
    }
    if (resizes) {
      img = img.resize(opts.width!, opts.height!, {
        fit: opts.fit ?? 'inside',
        withoutEnlargement: opts.withoutEnlargement ?? false,
        filter: opts.filter ?? 'lanczos3',
      })
    }
    if (opts.grayscale) {
      img = img.modulate({ saturation: 0 })
    }

    return await finish(applyFormat(img, format, quality, opts.lossless), format)
  }
  catch (cause) {
    throw mapImageCause(
      cause,
      'The image operation failed.\n\nCheck the file and try again.',
    )
  }
}
