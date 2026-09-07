import type { CropRect } from '#shared/utils/image/crop'
import type { ImageEncodeFormat, ImageFit } from '#shared/utils/image/types'

export interface BrowserImageProcessOptions {
  cropRect?: CropRect | null
  resizes?: boolean
  width?: number
  height?: number
  fit?: ImageFit
  withoutEnlargement?: boolean
  rotate?: number
  flip?: boolean
  flop?: boolean
  grayscale?: boolean
  format: ImageEncodeFormat
  quality?: number
}

export interface BrowserImageProcessResult {
  blob: Blob
  width: number
  height: number
  outputBytes: number
}

/** Formats that modern browsers can reliably encode via Canvas / OffscreenCanvas */
export function canProcessInBrowser(format: ImageEncodeFormat): boolean {
  return format === 'webp' || format === 'jpeg' || format === 'png'
}

export async function processImageInBrowser(
  file: Blob,
  options: BrowserImageProcessOptions,
): Promise<BrowserImageProcessResult> {
  let bitmap: ImageBitmap
  try {
    if (options.cropRect) {
      bitmap = await createImageBitmap(
        file,
        options.cropRect.x,
        options.cropRect.y,
        options.cropRect.width,
        options.cropRect.height,
      )
    }
    else {
      bitmap = await createImageBitmap(file)
    }
  }
  catch {
    throw new Error('The browser cannot decode this image.')
  }

  let destWidth = bitmap.width
  let destHeight = bitmap.height

  if (options.resizes && options.width && options.height) {
    const targetW = options.width
    const targetH = options.height

    if (options.fit === 'fill') {
      destWidth = targetW
      destHeight = targetH
    }
    else {
      // fit === 'inside'
      if (options.withoutEnlargement && bitmap.width <= targetW && bitmap.height <= targetH) {
        destWidth = bitmap.width
        destHeight = bitmap.height
      }
      else {
        const scale = Math.min(targetW / bitmap.width, targetH / bitmap.height)
        destWidth = Math.max(1, Math.round(bitmap.width * scale))
        destHeight = Math.max(1, Math.round(bitmap.height * scale))
      }
    }
  }

  const rot = ((options.rotate || 0) % 360 + 360) % 360
  const is90or270 = rot === 90 || rot === 270
  const canvasWidth = is90or270 ? destHeight : destWidth
  const canvasHeight = is90or270 ? destWidth : destHeight

  let canvas: OffscreenCanvas | HTMLCanvasElement
  let ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null

  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(canvasWidth, canvasHeight)
    ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | null
  }
  else {
    canvas = document.createElement('canvas')
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    ctx = canvas.getContext('2d')
  }

  if (!ctx) {
    bitmap.close()
    throw new Error('Canvas 2D context is not available.')
  }

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  ctx.save()
  ctx.translate(canvasWidth / 2, canvasHeight / 2)

  if (rot !== 0) {
    ctx.rotate((rot * Math.PI) / 180)
  }
  if (options.flop) {
    ctx.scale(-1, 1)
  }
  if (options.flip) {
    ctx.scale(1, -1)
  }
  if (options.grayscale) {
    ctx.filter = 'grayscale(100%)'
  }

  ctx.drawImage(bitmap, -destWidth / 2, -destHeight / 2, destWidth, destHeight)
  ctx.restore()
  bitmap.close()

  const mime = options.format === 'jpeg'
    ? 'image/jpeg'
    : options.format === 'png'
      ? 'image/png'
      : 'image/webp'

  const quality = (options.quality ?? 80) / 100

  let blob: Blob
  if (canvas instanceof OffscreenCanvas) {
    blob = await canvas.convertToBlob({ type: mime, quality })
  }
  else {
    blob = await new Promise<Blob>((resolve, reject) => {
      (canvas as HTMLCanvasElement).toBlob(
        (b) => {
          if (b) {
            resolve(b)
          }
          else {
            reject(new Error('Failed to encode image to blob.'))
          }
        },
        mime,
        quality,
      )
    })
  }

  return {
    blob,
    width: canvasWidth,
    height: canvasHeight,
    outputBytes: blob.size,
  }
}
