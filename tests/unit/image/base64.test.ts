import { describe, expect, it } from 'vitest'
import {
  formatAsCssBackground,
  formatAsHtmlImg,
  parseDataUri
} from '#shared/utils/image/base64'

describe('parseDataUri', () => {
  it('parses valid data uri with mime type', () => {
    const uri = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='
    const res = parseDataUri(uri)
    expect(res.isDataUri).toBe(true)
    expect(res.mimeType).toBe('image/svg+xml')
    expect(res.base64).toBe('PHN2Zz48L3N2Zz4=')
  })

  it('handles raw base64 string', () => {
    const raw = 'aGVsbG8='
    const res = parseDataUri(raw)
    expect(res.isDataUri).toBe(false)
    expect(res.mimeType).toBe('image/png')
    expect(res.base64).toBe('aGVsbG8=')
  })
})

describe('formatters', () => {
  it('formats html img tag', () => {
    const res = formatAsHtmlImg('data:image/png;base64,abc', 'Test')
    expect(res).toBe('<img src="data:image/png;base64,abc" alt="Test" />')
  })

  it('formats css background-image', () => {
    const res = formatAsCssBackground('data:image/png;base64,abc')
    expect(res).toBe('background-image: url(\'data:image/png;base64,abc\');')
  })
})
