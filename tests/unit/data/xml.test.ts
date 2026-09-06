import { Window } from 'happy-dom'
import { describe, expect, it } from 'vitest'
import { isXmlElementName, parseXml, stringifyXml } from '#shared/utils/data/xml'

// The parser reads `DOMParser` from `window`. A happy-dom window gives the
// tests one. happy-dom flags CDATA as an error, so the browser test covers it.
Object.assign(globalThis, { window: new Window() })

describe('stringifyXml', () => {
  it('uses the single key as the root and wraps several keys in root', () => {
    expect(stringifyXml({ name: 'KitDev' })).toBe('<?xml version="1.0" encoding="UTF-8"?>\n<name>KitDev</name>\n')
    const xml = stringifyXml({ name: 'KitDev', ready: true })
    expect(xml).toContain('<root>')
    expect(xml).toContain('  <name>KitDev</name>')
    expect(xml).toContain('  <ready>true</ready>')
  })

  it('writes arrays as repeated elements and invalid keys as item elements', () => {
    const xml = stringifyXml({ dependencies: { '@nuxt/ui': '^4.11.0', 'vue': '^3.5.42', 'tags': ['a', 'b'] } })
    expect(xml).toContain('<item key="@nuxt/ui">^4.11.0</item>')
    expect(xml).toContain('<vue>^3.5.42</vue>')
    expect(xml).toContain('<tags>a</tags>\n  <tags>b</tags>')
  })

  it('writes attributes, text, nulls, and escapes special characters', () => {
    const xml = stringifyXml({ note: { '@lang': 'en', '#text': 'a < b & "c"', 'empty': null } })
    expect(xml).toContain('<note lang="en">')
    expect(xml).toContain('a &lt; b &amp; "c"')
    expect(xml).toContain('<empty/>')
    expect(stringifyXml({ 'a"b': 1 })).toContain('<item key="a&quot;b">1</item>')
  })

  it('refuses an array root', () => {
    expect(() => stringifyXml([1, 2])).toThrow(/object root/)
  })
})

describe('parseXml', () => {
  it('reads elements, repeated siblings, attributes, and text', () => {
    const value = parseXml('<root><name>KitDev</name><tag>a</tag><tag>b</tag><note lang="en">hi</note><empty/></root>')
    expect(value).toEqual({
      root: {
        name: 'KitDev',
        tag: ['a', 'b'],
        note: { '@lang': 'en', '#text': 'hi' },
        empty: ''
      }
    })
  })

  it('drops comments and the declaration and decodes entities', () => {
    const value = parseXml('<?xml version="1.0"?><!-- c --><doc><code>a &lt; b &amp; c</code></doc>')
    expect(value).toEqual({ doc: { code: 'a < b & c' } })
  })

  it('reports a syntax error as a DataError', () => {
    expect(() => parseXml('<root><open></root>')).toThrow(/Invalid XML/)
  })

  it('round-trips the package.json shape', () => {
    const input = { name: 'kitdev', scripts: { 'test:watch': 'vitest' }, deps: { '@nuxt/ui': '4' }, ready: true }
    const back = parseXml(stringifyXml(input)) as { root: Record<string, unknown> }
    expect(back.root.name).toBe('kitdev')
    expect(back.root.ready).toBe('true')
    expect(back.root.scripts).toEqual({ item: { '@key': 'test:watch', '#text': 'vitest' } })
  })
})

describe('isXmlElementName', () => {
  it('accepts names and rejects attribute and text markers', () => {
    expect(isXmlElementName('name')).toBe(true)
    expect(isXmlElementName('svg:rect')).toBe(false)
    expect(isXmlElementName('@key')).toBe(false)
    expect(isXmlElementName('#text')).toBe(false)
    expect(isXmlElementName('1abc')).toBe(false)
  })
})
