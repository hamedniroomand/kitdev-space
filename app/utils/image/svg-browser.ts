export type SvgScale = 1 | 2 | 4
export type SvgExportFormat = 'png' | 'webp' | 'jpeg'

export interface SvgRasterizeOptions {
  scale?: SvgScale
  format?: SvgExportFormat
  quality?: number
  /** Target box in pixels at 1x. An empty value keeps the size of the SVG. */
  width?: number | null
  height?: number | null
  /** Fill color below the vector. JPEG has no alpha channel. */
  background?: string | null
  /** Stretch the vector to the exact box. The default keeps the ratio. */
  stretch?: boolean
}

export interface SvgRasterizeResult {
  blob: Blob
  width: number
  height: number
}

function boxSize(
  baseW: number,
  baseH: number,
  options: SvgRasterizeOptions,
): { width: number, height: number } {
  const boxW = options.width && options.width > 0 ? options.width : null
  const boxH = options.height && options.height > 0 ? options.height : null

  if (boxW && boxH) {
    if (options.stretch) {
      return { width: boxW, height: boxH }
    }
    const zoom = Math.min(boxW / baseW, boxH / baseH)
    return { width: baseW * zoom, height: baseH * zoom }
  }
  if (boxW) {
    return { width: boxW, height: baseH * (boxW / baseW) }
  }
  if (boxH) {
    return { width: baseW * (boxH / baseH), height: boxH }
  }
  return { width: baseW, height: baseH }
}

export async function rasterizeSvgInBrowser(
  svgSource: string | Blob,
  options: SvgRasterizeOptions = {},
): Promise<SvgRasterizeResult> {
  const { scale = 1, format = 'png', quality = 80 } = options

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

    const box = boxSize(baseW, baseH, options)
    const targetW = Math.max(1, Math.round(box.width * scale))
    const targetH = Math.max(1, Math.round(box.height * scale))

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

    // JPEG has no alpha channel. An unfilled canvas gives black edges.
    const fill = options.background ?? (format === 'jpeg' ? '#ffffff' : null)
    if (fill) {
      ctx.fillStyle = fill
      ctx.fillRect(0, 0, targetW, targetH)
    }

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, targetW, targetH)

    const mime = format === 'png' ? 'image/png' : `image/${format}`
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
