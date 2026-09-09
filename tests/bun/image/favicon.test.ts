import type { FaviconOptions } from '#shared/utils/image/favicon'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import { unzipSync, zipSync } from 'fflate'
import {
  buildFaviconZipEntries,
  buildHtmlSnippet,
  buildWebmanifest,
  FAVICON_ICO_SIZES,
  FAVICON_SIZES,
  sanitizePathPrefix,
} from '#shared/utils/image/favicon'

const png = new Uint8Array(readFileSync(join(import.meta.dir, 'fixtures/tiny.png')))

/** Build the package zip, then open it. The renderer needs a canvas, the packer does not. */
function openPackage(options: FaviconOptions = {}) {
  const icons = FAVICON_SIZES.map(({ name, size }) => ({ name, size, bytes: png }))
  return unzipSync(zipSync(buildFaviconZipEntries(icons, options)))
}

/** Every `href` of the HTML snippet, as a name inside the flat zip. */
function referencedFiles(options: FaviconOptions) {
  const prefix = sanitizePathPrefix(options.pathPrefix)
  const html = buildHtmlSnippet(options)
  const manifest = JSON.parse(buildWebmanifest(options)) as { icons: { src: string }[] }
  const refs = [
    ...[...html.matchAll(/href="([^"]+)"/g)].map(match => match[1]!),
    ...manifest.icons.map(icon => icon.src),
  ]
  return refs.map((ref) => {
    expect(ref.startsWith(prefix)).toBe(true)
    return ref.slice(prefix.length)
  })
}

describe('favicon package zip', () => {
  it('holds every file that the HTML snippet and the manifest reference', () => {
    const zip = openPackage()
    const files = referencedFiles({})

    expect(files).toContain('favicon.ico')
    expect(files).toContain('apple-touch-icon.png')
    expect(files).toContain('android-chrome-512x512.png')
    expect(files).toContain('site.webmanifest')

    for (const file of files) {
      expect(Object.keys(zip)).toContain(file)
      expect(zip[file]!.byteLength).toBeGreaterThan(0)
    }
  })

  it('keeps every reference valid with a path prefix', () => {
    const options: FaviconOptions = { pathPrefix: '/static/icons/' }
    const zip = openPackage(options)

    for (const file of referencedFiles(options)) {
      expect(Object.keys(zip)).toContain(file)
    }
  })

  it('packs the 16, 32, and 48 layers into favicon.ico', () => {
    const ico = openPackage()['favicon.ico']!
    const view = new DataView(ico.buffer, ico.byteOffset, ico.byteLength)

    expect(view.getUint16(2, true)).toBe(1)
    expect(view.getUint16(4, true)).toBe(FAVICON_ICO_SIZES.length)

    const layers = FAVICON_ICO_SIZES.map((_, index) => view.getUint8(6 + index * 16))
    expect(layers).toEqual([16, 32, 48])
  })

  it('declares the 180 Apple touch icon and the 512 maskable icon', () => {
    const zip = openPackage()
    const manifest = JSON.parse(new TextDecoder().decode(zip['site.webmanifest']!))

    expect(zip['apple-touch-icon.png']).toBeDefined()
    expect(buildHtmlSnippet({})).toContain('<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">')

    const maskable = manifest.icons.find((icon: { sizes: string }) => icon.sizes === '512x512')
    expect(maskable.purpose).toBe('any maskable')
  })
})
