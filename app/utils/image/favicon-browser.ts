import type { FaviconItemPreview, FaviconOptions, FaviconPackageResult } from '#shared/utils/image/favicon'
import { strToU8, zipSync } from 'fflate'
import { buildHtmlSnippet, buildIco, buildWebmanifest } from '#shared/utils/image/favicon'

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

  const sizes = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-48x48.png', size: 48 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 },
  ]

  const zipFiles: Record<string, Uint8Array> = {}
  const previews: FaviconItemPreview[] = []
  const renderedImages: { width: number, height: number, bytes: Uint8Array }[] = []

  const srcW = source.width
  const srcH = source.height
  // `contain` scales the long edge to the square. `cover` scales the short edge.
  // Both keep the source aspect ratio, so a non-square icon never distorts.
  const fitDim = options.fit === 'cover' ? Math.min(srcW, srcH) : Math.max(srcW, srcH)
  const background = options.fit === 'cover' ? '' : options.backgroundColor?.trim() || ''

  for (const { name, size } of sizes) {
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

    const arrayBuffer = await blob.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    zipFiles[name] = bytes
    renderedImages.push({ width: size, height: size, bytes })

    const dataUrl = URL.createObjectURL(blob)
    previews.push({
      name,
      size,
      dataUrl,
    })
  }

  source.close?.()

  // Create favicon.ico
  const ico16 = renderedImages.find(img => img.width === 16)!
  const ico32 = renderedImages.find(img => img.width === 32)!
  const icoBytes = buildIco([ico16, ico32])
  zipFiles['favicon.ico'] = icoBytes

  // Add site.webmanifest
  const webmanifest = buildWebmanifest(options)
  zipFiles['site.webmanifest'] = strToU8(webmanifest)

  // Add HTML snippet
  const htmlSnippet = buildHtmlSnippet(options)
  zipFiles['favicon-tags.html'] = strToU8(htmlSnippet)

  // Create ZIP archive
  const zipBytes = zipSync(zipFiles)

  let binaryString = ''
  const chunk = 8192
  for (let i = 0; i < zipBytes.length; i += chunk) {
    binaryString += String.fromCharCode(...zipBytes.subarray(i, i + chunk))
  }
  const zipBase64 = btoa(binaryString)

  return {
    zipBase64,
    previews,
    htmlSnippet,
    webmanifest,
  }
}
