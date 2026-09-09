import { describe, expect, it } from 'vitest'
import { formatPlaceholderImgTag, generatePlaceholderSvg, svgToDataUri } from '#shared/utils/image/placeholder'

function fontSizeOf(svg: string): number {
  return Number(svg.match(/font-size="(\d+(?:\.\d+)?)px"/)?.[1])
}

describe('generatePlaceholderSvg', () => {
  it('generates solid color SVG with default dimensions and text', () => {
    const svg = generatePlaceholderSvg({ width: 300, height: 200 })
    expect(svg).toContain('width="300"')
    expect(svg).toContain('height="200"')
    expect(svg).toContain('300 × 200')
    expect(svg).toContain('fill="#3b82f6"')
  })

  it('generates gradient SVG with custom text', () => {
    const svg = generatePlaceholderSvg({
      width: 400,
      height: 300,
      bgType: 'gradient',
      bgColor1: '#ff0000',
      bgColor2: '#0000ff',
      text: 'Hero Banner',
    })
    expect(svg).toContain('<linearGradient id="grad"')
    expect(svg).toContain('stop-color="#ff0000"')
    expect(svg).toContain('Hero Banner')
  })

  it('converts SVG to data uri', () => {
    const svg = '<svg></svg>'
    const uri = svgToDataUri(svg)
    expect(uri.startsWith('data:image/svg+xml;base64,')).toBe(true)
  })

  it('escapes XML special characters in colors and text', () => {
    const svg = generatePlaceholderSvg({
      width: 100,
      height: 100,
      bgColor1: 'red" onload="alert(1)',
      textColor: 'blue<test>',
      text: 'Hello <World> & "Friends"',
    })
    expect(svg).not.toContain('onload="alert(1)')
    expect(svg).toContain('&quot;')
    expect(svg).toContain('&lt;World&gt;')
    expect(svg).toContain('&amp;')
  })

  it('keeps the default font size when the label fits', () => {
    expect(fontSizeOf(generatePlaceholderSvg({ width: 300, height: 200 }))).toBe(25)
  })

  it('reduces the font size for a long label', () => {
    const short = generatePlaceholderSvg({ width: 300, height: 200, text: 'Hero' })
    const long = generatePlaceholderSvg({
      width: 300,
      height: 200,
      text: 'A very long placeholder label that must fit',
    })
    expect(fontSizeOf(long)).toBeLessThan(fontSizeOf(short))
    expect(fontSizeOf(long)).toBeGreaterThanOrEqual(6)
  })

  it('measures the raw label, not the escaped label', () => {
    const plain = generatePlaceholderSvg({ width: 300, height: 200, text: 'aaaaaaaaaaaaaaaaaaaa' })
    const ampersands = generatePlaceholderSvg({ width: 300, height: 200, text: '&&&&&&&&&&&&&&&&&&&&' })
    expect(fontSizeOf(ampersands)).toBe(fontSizeOf(plain))
  })
})

describe('formatPlaceholderImgTag', () => {
  it('builds an img tag with the clamped size and the label as alt text', () => {
    const tag = formatPlaceholderImgTag({ width: 9000, height: 400, text: 'Hero "Banner"' })
    expect(tag).toContain('<img src="data:image/svg+xml;base64,')
    expect(tag).toContain('width="4000"')
    expect(tag).toContain('height="400"')
    expect(tag).toContain('alt="Hero &quot;Banner&quot;"')
    expect(tag.endsWith('">')).toBe(true)
  })

  it('uses the dimensions as alt text when no label is set', () => {
    expect(formatPlaceholderImgTag({ width: 600, height: 400 })).toContain('alt="600 × 400"')
  })
})
