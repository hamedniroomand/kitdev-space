export type SvgScale = 1 | 2 | 4
export type SvgExportFormat = 'png' | 'webp'

export interface SvgRasterizeResult {
  blob: Blob
  width: number
  height: number
}

export async function rasterizeSvgInBrowser(
  svgSource: string | Blob,
  scale: SvgScale = 1,
  format: SvgExportFormat = 'png',
  quality = 80,
): Promise<SvgRasterizeResult> {
  const svgBlob = typeof svgSource === 'string'
    ? new Blob([svgSource], { type: 'image/svg+xml;charset=utf-8' })
    : svgSource

  const url = URL.createObjectURL(svgBlob)

  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('The browser cannot decode this SVG.'))
      img.src = url
    })

    const baseW = img.naturalWidth || img.width || 300
    const baseH = img.naturalHeight || img.height || 150

    const targetW = Math.max(1, Math.round(baseW * scale))
    const targetH = Math.max(1, Math.round(baseH * scale))

    let canvas: OffscreenCanvas | HTMLCanvasElement
    let ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null

    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(targetW, targetH)
      ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | null
    }
    else {
      canvas = document.createElement('canvas')
      canvas.width = targetW
      canvas.height = targetH
      ctx = canvas.getContext('2d')
    }

    if (!ctx) {
      throw new Error('Canvas 2D context is not available.')
    }

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, targetW, targetH)

    const mime = format === 'webp' ? 'image/webp' : 'image/png'
    const q = quality / 100

    let blob: Blob
    if (canvas instanceof OffscreenCanvas) {
      blob = await canvas.convertToBlob({ type: mime, quality: q })
    }
    else {
      blob = await new Promise<Blob>((resolve, reject) => {
        (canvas as HTMLCanvasElement).toBlob(
          b => (b ? resolve(b) : reject(new Error('Failed to encode rasterized SVG.'))),
          mime,
          q,
        )
      })
    }

    return {
      blob,
      width: targetW,
      height: targetH,
    }
  }
  finally {
    URL.revokeObjectURL(url)
  }
}
