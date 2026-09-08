import { describe, expect, it } from 'vitest'
import { buildHtmlSnippet, buildIco, buildWebmanifest } from '#shared/utils/image/favicon'

describe('favicon utility', () => {
  it('builds a valid webmanifest string', () => {
    const manifestStr = buildWebmanifest({
      appName: 'Super App',
      shortName: 'Super',
      themeColor: '#0066ff',
    })
    const manifest = JSON.parse(manifestStr)

    expect(manifest.name).toBe('Super App')
    expect(manifest.short_name).toBe('Super')
    expect(manifest.theme_color).toBe('#0066ff')
    expect(manifest.icons).toHaveLength(2)
  })

  it('builds an HTML snippet with required link and meta tags', () => {
    const html = buildHtmlSnippet({
      themeColor: '#10b981',
    })

    expect(html).toContain('<link rel="icon" type="image/x-icon" href="/favicon.ico">')
    expect(html).toContain('favicon-48x48.png')
    expect(html).toContain('apple-touch-icon.png')
    expect(html).toContain('<meta name="theme-color" content="#10b981">')
  })

  it('builds an ICO binary structure', () => {
    const dummyPng16 = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3])
    const dummyPng32 = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 4, 5, 6, 7])

    const ico = buildIco([
      { width: 16, height: 16, bytes: dummyPng16 },
      { width: 32, height: 32, bytes: dummyPng32 },
    ])

    const view = new DataView(ico.buffer, ico.byteOffset, ico.byteLength)
    expect(view.getUint16(0, true)).toBe(0) // Reserved
    expect(view.getUint16(2, true)).toBe(1) // Type = ICO
    expect(view.getUint16(4, true)).toBe(2) // 2 images

    // First image entry: 16x16
    expect(view.getUint8(6)).toBe(16)
    expect(view.getUint8(7)).toBe(16)

    // Second image entry: 32x32
    expect(view.getUint8(22)).toBe(32)
    expect(view.getUint8(23)).toBe(32)
  })
})
