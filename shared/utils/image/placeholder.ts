export interface PlaceholderOptions {
  width: number
  height: number
  bgType?: 'solid' | 'gradient'
  bgColor1?: string
  bgColor2?: string
  text?: string
  textColor?: string
  fontSize?: number
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// ponytail: an SVG string builder cannot measure text, so the label width comes
// from the character count and an average glyph width of 0.6 em. A run of wide
// glyphs, such as "WWWW", can still touch the edge, and the 6 px floor keeps a
// very long label small but legible. Upgrade path: measure the label with
// `OffscreenCanvas` in the browser and pass the exact `fontSize`.
const GLYPH_WIDTH_RATIO = 0.6
const TEXT_BOX_RATIO = 0.9
const MIN_FONT_SIZE = 6

interface ResolvedPlaceholder {
  width: number
  height: number
  text: string
  fontSize: number
}

function resolvePlaceholder(options: PlaceholderOptions): ResolvedPlaceholder {
  const width = Math.max(1, Math.min(options.width || 600, 4000))
  const height = Math.max(1, Math.min(options.height || 400, 4000))
  const text = options.text !== undefined ? options.text : `${width} × ${height}`
  const requested = options.fontSize || Math.max(12, Math.min(Math.round(Math.min(width, height) / 8), 72))
  const fitted = Math.floor((width * TEXT_BOX_RATIO) / (Math.max(1, text.length) * GLYPH_WIDTH_RATIO))

  return {
    width,
    height,
    text,
    fontSize: Math.min(requested, Math.max(MIN_FONT_SIZE, fitted)),
  }
}

export function generatePlaceholderSvg(options: PlaceholderOptions): string {
  const { width, height, text, fontSize } = resolvePlaceholder(options)
  const bgType = options.bgType || 'solid'
  const bgColor1 = escapeXml(options.bgColor1 || '#3b82f6')
  const bgColor2 = escapeXml(options.bgColor2 || '#8b5cf6')
  const textColor = escapeXml(options.textColor || '#ffffff')

  let defs = ''
  let fill = bgColor1

  if (bgType === 'gradient') {
    defs = `
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgColor1}" />
      <stop offset="100%" stop-color="${bgColor2}" />
    </linearGradient>
  </defs>`
    fill = 'url(#grad)'
  }

  const escapedText = escapeXml(text)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${defs}
  <rect width="100%" height="100%" fill="${fill}" />
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="${textColor}" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}px" font-weight="600">${escapedText}</text>
</svg>`.trim()
}

export function svgToDataUri(svg: string): string {
  // `btoa` exists in every browser, in Node 16 and later, and in Bun.
  const encoded = btoa(unescape(encodeURIComponent(svg)))
  return `data:image/svg+xml;base64,${encoded}`
}

export function formatPlaceholderImgTag(options: PlaceholderOptions): string {
  const { width, height, text } = resolvePlaceholder(options)
  const src = svgToDataUri(generatePlaceholderSvg(options))

  return `<img src="${src}" width="${width}" height="${height}" alt="${escapeXml(text)}">`
}
