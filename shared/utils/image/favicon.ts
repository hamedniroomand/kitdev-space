/** `contain` pads the source into the square. `cover` crops the source to fill it. */
export type FaviconFit = 'contain' | 'cover'

export interface FaviconOptions {
  appName?: string
  shortName?: string
  themeColor?: string
  /** Fills the padding of a `contain` icon. An empty value keeps the padding transparent. */
  backgroundColor?: string
  fit?: FaviconFit
  /** The folder that serves the icons, such as `/static/icons/`. */
  pathPrefix?: string
}

/**
 * Normalize a path prefix to the `/folder/` form. It removes each character
 * that a URL path cannot hold, so a prefix cannot break out of an `href`
 * attribute or point above the site root.
 */
export function sanitizePathPrefix(input?: string): string {
  const safe = (input ?? '')
    .replace(/[^\w\-./~]/g, '')
    .replace(/\.{2,}/g, '')
    .replace(/\/{2,}/g, '/')
    .replace(/^\/+|\/+$/g, '')
  return safe ? `/${safe}/` : '/'
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
  const prefix = sanitizePathPrefix(options.pathPrefix)
  const manifest = {
    name: options.appName?.trim() || 'My Application',
    short_name: options.shortName?.trim() || options.appName?.trim() || 'App',
    icons: [
      {
        src: `${prefix}android-chrome-192x192.png`,
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: `${prefix}android-chrome-512x512.png`,
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    theme_color: options.themeColor?.trim() || '#ffffff',
    background_color: options.backgroundColor?.trim() || '#ffffff',
    display: 'standalone',
  }
  return JSON.stringify(manifest, null, 2)
}

export function buildHtmlSnippet(options: FaviconOptions): string {
  const theme = options.themeColor?.trim() || '#ffffff'
  const prefix = sanitizePathPrefix(options.pathPrefix)
  return [
    '<!-- Favicon and App Icons -->',
    `<link rel="icon" type="image/x-icon" href="${prefix}favicon.ico">`,
    `<link rel="icon" type="image/png" sizes="16x16" href="${prefix}favicon-16x16.png">`,
    `<link rel="icon" type="image/png" sizes="32x32" href="${prefix}favicon-32x32.png">`,
    `<link rel="icon" type="image/png" sizes="48x48" href="${prefix}favicon-48x48.png">`,
    `<link rel="apple-touch-icon" sizes="180x180" href="${prefix}apple-touch-icon.png">`,
    `<link rel="manifest" href="${prefix}site.webmanifest">`,
    `<meta name="theme-color" content="${theme}">`,
  ].join('\n')
}
