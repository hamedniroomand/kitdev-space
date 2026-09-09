import type { FaviconItemPreview, FaviconOptions, FaviconPackageResult, FaviconRenderedIcon } from '#shared/utils/image/favicon'
import { buildFaviconZipEntries, buildHtmlSnippet, buildWebmanifest, FAVICON_SIZES } from '#shared/utils/image/favicon'
import { blobToBytes, zipInBrowser } from '~/utils/image/zip'

async function loadImageSource(file: Blob): Promise<{
  width: number
  height: number
  draw: (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, dx: number, dy: number, dw: number, dh: number) => void
  close?: () => void
}> {
  try {
    const bitmap = await createImageBitmap(file)
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (ctx, dx, dy, dw, dh) => ctx.drawImage(bitmap, dx, dy, dw, dh),
      close: () => bitmap.close(),
    }
  }
  catch {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        resolve({
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          draw: (ctx, dx, dy, dw, dh) => ctx.drawImage(img, dx, dy, dw, dh),
          close: () => URL.revokeObjectURL(url),
        })
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image in browser.'))
      }
      img.src = url
    })
  }
}

export async function generateFaviconPackageInBrowser(
  file: Blob,
  options: FaviconOptions = {},
): Promise<FaviconPackageResult> {
  const source = await loadImageSource(file)

  const previews: FaviconItemPreview[] = []
  const icons: FaviconRenderedIcon[] = []

  const srcW = source.width
  const srcH = source.height
  // `contain` scales the long edge to the square. `cover` scales the short edge.
  // Both keep the source aspect ratio, so a non-square icon never distorts.
  const fitDim = options.fit === 'cover' ? Math.min(srcW, srcH) : Math.max(srcW, srcH)
  const background = options.fit === 'cover' ? '' : options.backgroundColor?.trim() || ''

  for (const { name, size } of FAVICON_SIZES) {
    let canvas: OffscreenCanvas | HTMLCanvasElement
    let ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null

    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(size, size)
      ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | null
    }
    else {
      canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      ctx = canvas.getContext('2d')
    }

    if (!ctx) {
      source.close?.()
      throw new Error('Canvas 2D context not available')
    }

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    if (background) {
      ctx.fillStyle = background
      ctx.fillRect(0, 0, size, size)
    }

    const scale = size / fitDim
    const dw = Math.max(1, Math.round(srcW * scale))
    const dh = Math.max(1, Math.round(srcH * scale))
    const dx = Math.round((size - dw) / 2)
    const dy = Math.round((size - dh) / 2)

    source.draw(ctx, dx, dy, dw, dh)

    let blob: Blob
    if (canvas instanceof OffscreenCanvas) {
      blob = await canvas.convertToBlob({ type: 'image/png' })
    }
    else {
      blob = await new Promise<Blob>((resolve, reject) => {
        (canvas as HTMLCanvasElement).toBlob(
          b => (b ? resolve(b) : reject(new Error('toBlob failed'))),
          'image/png',
        )
      })
    }

    icons.push({ name, size, bytes: await blobToBytes(blob) })
    previews.push({ name, size, dataUrl: URL.createObjectURL(blob) })
  }

  source.close?.()

  return {
    zipBlob: zipInBrowser(buildFaviconZipEntries(icons, options)),
    previews,
    htmlSnippet: buildHtmlSnippet(options),
    webmanifest: buildWebmanifest(options),
  }
}
