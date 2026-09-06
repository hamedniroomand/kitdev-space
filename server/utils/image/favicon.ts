import { strToU8, zipSync } from 'fflate'
import { processImage } from './pipeline'

export interface FaviconOptions {
  appName?: string
  shortName?: string
  themeColor?: string
  backgroundColor?: string
}

export interface FaviconItemPreview {
  name: string
  size: number
  dataUrl: string
}

export interface FaviconPackageResult {
  zipBase64: string
  previews: FaviconItemPreview[]
  htmlSnippet: string
  webmanifest: string
}

export function buildIco(images: { width: number, height: number, bytes: Uint8Array }[]): Uint8Array {
  // ICO Header: 6 bytes
  // Reserved (2 bytes) = 0
  // Type (2 bytes) = 1 (ICO)
  // Count (2 bytes) = number of images
  const headerSize = 6
  const dirEntrySize = 16
  const count = images.length
  let offset = headerSize + dirEntrySize * count

  let totalSize = offset
  for (const img of images) {
    totalSize += img.bytes.byteLength
  }

  const buffer = new Uint8Array(totalSize)
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)

  // Header
  view.setUint16(0, 0, true) // Reserved
  view.setUint16(2, 1, true) // Type: 1 = ICO
  view.setUint16(4, count, true) // Number of images

  // Directory entries & Image data
  for (let i = 0; i < count; i++) {
    const img = images[i]!
    const entryOffset = headerSize + i * dirEntrySize

    view.setUint8(entryOffset, img.width >= 256 ? 0 : img.width)
    view.setUint8(entryOffset + 1, img.height >= 256 ? 0 : img.height)
    view.setUint8(entryOffset + 2, 0) // Color palette count (0 for >= 8bpp)
    view.setUint8(entryOffset + 3, 0) // Reserved
    view.setUint16(entryOffset + 4, 1, true) // Color planes
    view.setUint16(entryOffset + 6, 32, true) // Bits per pixel (32-bit RGBA)
    view.setUint32(entryOffset + 8, img.bytes.byteLength, true) // Image size in bytes
    view.setUint32(entryOffset + 12, offset, true) // File offset

    // Copy raw image bytes (PNG)
    buffer.set(img.bytes, offset)
    offset += img.bytes.byteLength
  }

  return buffer
}

export function buildWebmanifest(options: FaviconOptions): string {
  const manifest = {
    name: options.appName?.trim() || 'My Application',
    short_name: options.shortName?.trim() || options.appName?.trim() || 'App',
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ],
    theme_color: options.themeColor?.trim() || '#ffffff',
    background_color: options.backgroundColor?.trim() || '#ffffff',
    display: 'standalone'
  }
  return JSON.stringify(manifest, null, 2)
}

export function buildHtmlSnippet(options: FaviconOptions): string {
  const theme = options.themeColor?.trim() || '#ffffff'
  return [
    '<!-- Favicon and App Icons -->',
    '<link rel="icon" type="image/x-icon" href="/favicon.ico">',
    '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
    '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
    '<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">',
    '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
    `<meta name="theme-color" content="${theme}">`
  ].join('\n')
}

export async function generateFaviconPackage(
  input: Uint8Array,
  options: FaviconOptions = {}
): Promise<FaviconPackageResult> {
  const sizes = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-48x48.png', size: 48 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 }
  ]

  const zipFiles: Record<string, Uint8Array> = {}
  const previews: FaviconItemPreview[] = []
  const renderedImages: { width: number, height: number, bytes: Uint8Array }[] = []

  for (const { name, size } of sizes) {
    const res = await processImage(input, {
      width: size,
      height: size,
      fit: 'inside',
      format: 'png'
    })

    zipFiles[name] = res.bytes
    renderedImages.push({ width: size, height: size, bytes: res.bytes })

    const base64 = Buffer.from(res.bytes).toString('base64')
    previews.push({
      name,
      size,
      dataUrl: `data:image/png;base64,${base64}`
    })
  }

  // Create favicon.ico using 16x16 and 32x32 PNGs
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
  const zipBase64 = Buffer.from(zipBytes).toString('base64')

  return {
    zipBase64,
    previews,
    htmlSnippet,
    webmanifest
  }
}
