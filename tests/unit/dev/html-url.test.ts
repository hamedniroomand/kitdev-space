import { describe, expect, it } from 'vitest'
import {
  htmlEntityDecode,
  htmlEntityEncode,
  urlDecode,
  urlEncode
} from '../../../shared/utils/dev/html-url'

describe('html-url codec utilities', () => {
  it('encodes and decodes URL strings', () => {
    const original = 'https://example.com/search?q=hello world&lang=en#top'
    const encoded = urlEncode(original)
    expect(encoded).toBe('https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dhello%20world%26lang%3Den%23top')
    expect(urlDecode(encoded)).toBe(original)
  })

  it('encodes HTML entities', () => {
    const raw = '<div class="card" data-note=\'hello & goodbye\'>'
    const encoded = htmlEntityEncode(raw)
    expect(encoded).toBe('&lt;div class=&quot;card&quot; data-note=&#39;hello &amp; goodbye&#39;&gt;')
  })

  it('decodes HTML entities including named, decimal, and hex', () => {
    expect(htmlEntityDecode('&lt;b&gt;Hello &amp; World&lt;/b&gt;')).toBe('<b>Hello & World</b>')
    expect(htmlEntityDecode('&#39;test&#39; and &quot;quotes&quot;')).toBe('\'test\' and "quotes"')
    expect(htmlEntityDecode('&#65;&#66;&#67;')).toBe('ABC')
    expect(htmlEntityDecode('&#x41;&#x42;&#x43;')).toBe('ABC')
  })
})
