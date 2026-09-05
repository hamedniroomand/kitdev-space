import type {
  ImageEncodeFormat,
  ImageFilter,
  ImageFit
} from '../../../shared/utils/image/types'
import { ImageError } from './errors'
import { MAX_PIXELS } from './limits'

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

function createPipeline(input: Uint8Array) {
  return new Bun.Image(input, { maxPixels: MAX_PIXELS, autoOrient: true })
}

function mimeFor(format: ImageEncodeFormat): string {
  return format === 'jpeg' ? 'image/jpeg' : `image/${format}`
}

function applyFormat(img: Bun.Image, format: ImageEncodeFormat, quality = 80) {
  switch (format) {
    case 'webp':
      return img.webp({ quality })
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
  format: ImageEncodeFormat
): Promise<ImageResult> {
  try {
    const bytes = await img.bytes()
    return {
      bytes,
      mime: mimeFor(format),
      width: img.width,
      height: img.height
    }
  } catch (cause) {
    const code = (cause as { code?: string })?.code
    if (code === 'ERR_IMAGE_FORMAT_UNSUPPORTED') {
      throw new ImageError(
        'This image format is not supported on this server.\n\nTry WebP, JPEG, or PNG.'
      )
    }
    throw new ImageError('The image operation failed.\n\nCheck the file and try again.', { cause })
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
      format: String(meta.format)
    }
  } catch (cause) {
    if (cause instanceof ImageError) {
      throw cause
    }
    throw new ImageError('The image could not be read.\n\nCheck the file and try again.', { cause })
  }
}

export async function convertImage(
  input: Uint8Array,
  opts: { format: ImageEncodeFormat, quality?: number }
): Promise<ImageResult> {
  const quality = clampQuality(opts.quality)
  const img = applyFormat(createPipeline(input), opts.format, quality)
  return finish(img, opts.format)
}

export async function resizeImage(
  input: Uint8Array,
  opts: {
    width: number
    height: number
    fit: ImageFit
    withoutEnlargement?: boolean
    filter?: ImageFilter
    format?: ImageEncodeFormat
    quality?: number
  }
): Promise<ImageResult> {
  if (!Number.isInteger(opts.width) || opts.width < 1 || opts.width > 8192) {
    throw new ImageError('Width must be an integer from 1 to 8192.')
  }
  if (!Number.isInteger(opts.height) || opts.height < 1 || opts.height > 8192) {
    throw new ImageError('Height must be an integer from 1 to 8192.')
  }

  const format = opts.format ?? 'webp'
  const quality = clampQuality(opts.quality)
  let img = createPipeline(input).resize(opts.width, opts.height, {
    fit: opts.fit,
    withoutEnlargement: opts.withoutEnlargement ?? false,
    filter: opts.filter ?? 'lanczos3'
  })
  img = applyFormat(img, format, quality)
  return finish(img, format)
}

export async function transformImage(
  input: Uint8Array,
  opts: {
    rotate?: 90 | 180 | 270
    flip?: boolean
    flop?: boolean
    grayscale?: boolean
    format?: ImageEncodeFormat
    quality?: number
  }
): Promise<ImageResult> {
  const format = opts.format ?? 'webp'
  const quality = clampQuality(opts.quality)
  let img = createPipeline(input)

  if (opts.rotate) {
    img = img.rotate(opts.rotate)
  }
  if (opts.flip) {
    img = img.flip()
  }
  if (opts.flop) {
    img = img.flop()
  }
  if (opts.grayscale) {
    img = img.modulate({ saturation: 0 })
  }

  return finish(applyFormat(img, format, quality), format)
}

export async function stripMetadata(
  input: Uint8Array,
  opts?: { format?: ImageEncodeFormat, quality?: number }
): Promise<ImageResult> {
  const format = opts?.format ?? 'webp'
  return convertImage(input, { format, quality: opts?.quality })
}
