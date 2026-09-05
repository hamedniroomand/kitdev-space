import { describe, expect, it } from 'bun:test'
import {
  assertNoExternalSvgResources,
  isSvgBytes
} from '../../../server/utils/image/svg'

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
