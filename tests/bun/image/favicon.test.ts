import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'bun:test'
import { unzipSync } from 'fflate'
import { generateFaviconPackage } from '#server/utils/image/favicon'

const fixture = new Uint8Array(
  readFileSync(join(import.meta.dir, 'fixtures/tiny.png')),
)

const EXPECTED_NAMES = [
  'favicon-16x16.png',
  'favicon-32x32.png',
  'favicon-48x48.png',
  'apple-touch-icon.png',
  'android-chrome-192x192.png',
  'android-chrome-512x512.png',
]

describe('generateFaviconPackage', () => {
  it('keeps the preview order of the size list', async () => {
    // The sizes render at the same time, so this guards the order.
    const result = await generateFaviconPackage(fixture)
    expect(result.previews.map(p => p.name)).toEqual(EXPECTED_NAMES)
    expect(result.previews.map(p => p.size)).toEqual([16, 32, 48, 180, 192, 512])
  })

  it('gives every preview its own PNG data URL', async () => {
    const result = await generateFaviconPackage(fixture)
    for (const preview of result.previews) {
      expect(preview.dataUrl.startsWith('data:image/png;base64,')).toBe(true)
    }
    // A wrong parallel write would repeat one image for every size.
    const unique = new Set(result.previews.map(p => p.dataUrl))
    expect(unique.size).toBe(EXPECTED_NAMES.length)
  })

  it('writes a readable zip that holds every file', async () => {
    const result = await generateFaviconPackage(fixture, { appName: 'KitDev' })
    const zip = unzipSync(Buffer.from(result.zipBase64, 'base64'))

    for (const name of EXPECTED_NAMES) {
      expect(zip[name]).toBeDefined()
      expect(zip[name]!.byteLength).toBeGreaterThan(0)
    }
    expect(zip['favicon.ico']).toBeDefined()
    expect(zip['site.webmanifest']).toBeDefined()
    expect(zip['favicon-tags.html']).toBeDefined()
  })

  it('builds an ico with the ICO magic bytes', async () => {
    const result = await generateFaviconPackage(fixture)
    const zip = unzipSync(Buffer.from(result.zipBase64, 'base64'))
    const ico = zip['favicon.ico']!
    // Reserved 0, type 1 (icon), count 2 (16 and 32).
    expect([ico[0], ico[1], ico[2], ico[3]]).toEqual([0, 0, 1, 0])
    expect(ico[4]).toBe(2)
  })

  it('puts the app name in the webmanifest', async () => {
    const result = await generateFaviconPackage(fixture, { appName: 'KitDev' })
    expect(JSON.parse(result.webmanifest).name).toBe('KitDev')
  })
})
