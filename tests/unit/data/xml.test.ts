import { Window } from 'happy-dom'
import { describe, expect, it } from 'vitest'
import { isXmlElementName, parseXml, stringifyXml } from '#shared/utils/data/xml'
import { mixedContentXml, namespaceXml, repeatedChildrenXml } from './fixtures-xml'

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
        empty: '',
      },
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

describe('parseXml structural fixtures', () => {
  it('handles XML namespaces and prefixes', () => {
    const result = parseXml(namespaceXml) as Record<string, unknown>
    const feed = result.feed as Record<string, unknown>
    expect(feed['@xmlns']).toBe('http://www.w3.org/2005/Atom')
    expect(feed['@xmlns:dc']).toBe('http://purl.org/dc/elements/1.1/')
    expect(feed.title).toBe('KitDev Updates')
    const entry = feed.entry as Record<string, unknown>
    expect(entry.title).toBe('Version 2.0')
    expect(entry['dc:creator']).toBe('Hamed')
    expect(entry['dc:date']).toBe('2026-09-08')
  })

  it('handles repeated child elements and multiple lists', () => {
    const result = parseXml(repeatedChildrenXml) as Record<string, unknown>
    const store = result.store as Record<string, unknown>
    expect(store['@name']).toBe('Bookstore')
    expect(Array.isArray(store.book)).toBe(true)
    const books = store.book as Array<Record<string, unknown>>
    expect(books).toHaveLength(2)
    expect(books[0]!['@category']).toBe('fiction')
    expect(books[0]!.title).toBe('Great Novel')
    expect(books[0]!.author).toEqual(['Author One', 'Author Two'])
    expect(books[1]!['@category']).toBe('tech')
    expect(books[1]!.author).toBe('Tech Writer')
  })

  it('handles mixed text and child elements', () => {
    const result = parseXml(mixedContentXml) as Record<string, unknown>
    const article = result.article as Record<string, unknown>
    expect(article.title).toBe('Getting Started')
    const content = article.content as Record<string, unknown>
    expect(content.b).toBe('KitDev')
    expect(content.i).toBe('fast')
    expect(content.u).toBe('private')
    expect(content['#text']).toContain('Welcome to')
    expect(content['#text']).toContain('the')
    expect(content['#text']).toContain('and')
    expect(content['#text']).toContain('tool suite.')
    const footer = article.footer as Record<string, unknown>
    expect(footer.strong).toBe('KitDev')
    expect(footer['#text']).toBe('Copyright 2026  Inc.')
  })
})

describe('parseXml error reporting', () => {
  it('rejects conflicting namespace URIs in strict mode', () => {
    const xml = '<root xmlns:ns="https://example.com/v1"><child xmlns:ns="https://example.com/v2"><ns:item/></child></root>'
    expect(() => parseXml(xml, { strict: true })).toThrowError(
      'Namespace prefix "ns" in element <child> has conflicting URIs: "https://example.com/v1" and "https://example.com/v2".',
    )
  })

  it('identifies the specific node name when mixed content cannot convert in strict mode', () => {
    const xml = '<root><paragraph>Text before <em>highlight</em> text after.</paragraph></root>'
    expect(() => parseXml(xml, { strict: true })).toThrowError(
      'Cannot convert mixed content in element <paragraph> to JSON.\n\nThe element contains both text and child elements.',
    )
  })

  it('identifies nested node name for mixed content in strict mode', () => {
    const xml = '<root><clean><item>value</item></clean><dirty>Some text <span>inline</span></dirty></root>'
    expect(() => parseXml(xml, { strict: true })).toThrowError(
      'Cannot convert mixed content in element <dirty> to JSON.',
    )
  })
})
