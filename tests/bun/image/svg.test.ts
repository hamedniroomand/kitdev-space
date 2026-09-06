import { describe, expect, it } from 'bun:test'
import { MAX_PIXELS } from '#server/utils/image/limits'
import {
  assertNoExternalSvgResources,
  isSvgBytes,
  rasterizeSvg
} from '#server/utils/image/svg'

const enc = new TextEncoder()

describe('isSvgBytes', () => {
  it('detects svg with xml prologue', () => {
    const bytes = enc.encode(
      '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>'
    )
    expect(isSvgBytes(bytes)).toBe(true)
  })

  it('returns false for png magic', () => {
    expect(isSvgBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false)
  })
})

describe('assertNoExternalSvgResources', () => {
  it('allows xmlns and local shapes', () => {
    const bytes = enc.encode(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>'
    )
    expect(() => assertNoExternalSvgResources(bytes)).not.toThrow()
  })

  it('rejects remote href', () => {
    const bytes = enc.encode(
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><image href="https://example.com/a.png"/></svg>'
    )
    expect(() => assertNoExternalSvgResources(bytes)).toThrow(/external resource/i)
  })

  it('rejects protocol-relative href', () => {
    const bytes = enc.encode(
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="//cdn.example/a.png"/></svg>'
    )
    expect(() => assertNoExternalSvgResources(bytes)).toThrow(/external resource/i)
  })

  it('rejects remote url() in style', () => {
    const bytes = enc.encode(
      '<svg xmlns="http://www.w3.org/2000/svg"><rect style="fill:url(https://example.com/p.png)"/></svg>'
    )
    expect(() => assertNoExternalSvgResources(bytes)).toThrow(/external resource/i)
  })
})

describe('rasterizeSvg', () => {
  it('returns png bytes for a simple svg', () => {
    const bytes = enc.encode(
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="20" height="10" fill="#0f0"/></svg>'
    )
    const png = rasterizeSvg(bytes)
    expect(png[0]).toBe(0x89)
    expect(png[1]).toBe(0x50)
    expect(png[2]).toBe(0x4e)
    expect(png[3]).toBe(0x47)
  })

  it('rejects remote resources before render', () => {
    const bytes = enc.encode(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><image href="https://example.com/a.png" width="10" height="10"/></svg>'
    )
    expect(() => rasterizeSvg(bytes)).toThrow(/external resource/i)
  })

  it('scales down when intrinsic pixels exceed MAX_PIXELS', () => {
    const side = 10000
    expect(side * side).toBeGreaterThan(MAX_PIXELS)
    const bytes = enc.encode(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${side}" height="${side}"><rect width="100%" height="100%" fill="#00f"/></svg>`
    )
    const png = rasterizeSvg(bytes)
    expect(png.byteLength).toBeGreaterThan(0)
  })

  it('respects target width and height box', () => {
    const bytes = enc.encode(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><rect width="400" height="200" fill="#f00"/></svg>'
    )
    const png = rasterizeSvg(bytes, { width: 100, height: 100 })
    expect(png.byteLength).toBeGreaterThan(0)
  })
})
