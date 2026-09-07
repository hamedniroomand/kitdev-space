import { describe, expect, it } from 'vitest'
import { generatePlaceholderSvg, svgToDataUri } from '#shared/utils/image/placeholder'

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
})
