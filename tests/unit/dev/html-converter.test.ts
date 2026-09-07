import { describe, expect, it } from 'vitest'
import {
  convertHtmlToJsx,
  convertHtmlToVue,
  parseCssToJsxStyle,
  selfCloseVoidTags,
} from '#shared/utils/dev/html-converter'

describe('html-converter', () => {
  it('converts class and for attributes to JSX equivalents', () => {
    const html = '<label class="form-label" for="email-input">Email</label>'
    const jsx = convertHtmlToJsx(html)
    expect(jsx).toBe('<label className="form-label" htmlFor="email-input">Email</label>')
  })

  it('converts self-closing void tags', () => {
    const html = '<div><img src="avatar.png"><br><input type="text"></div>'
    const closed = selfCloseVoidTags(html)
    expect(closed).toBe('<div><img src="avatar.png" /><br /><input type="text" /></div>')
  })

  it('converts inline style strings to JSX objects', () => {
    const style = 'color: red; font-size: 14px; margin-top: 20px; --custom-bg: #fff'
    const jsxStyle = parseCssToJsxStyle(style)
    expect(jsxStyle).toBe('style={{ color: \'red\', fontSize: \'14px\', marginTop: \'20px\', \'--custom-bg\': \'#fff\' }}')
  })

  it('converts HTML comments to JSX comment expressions', () => {
    const html = '<div><!-- Header navigation --><span>Hello</span></div>'
    const jsx = convertHtmlToJsx(html)
    expect(jsx).toBe('<div>{/* Header navigation */}<span>Hello</span></div>')
  })

  it('converts SVG attributes to camelCase in JSX', () => {
    const svg = '<svg viewBox="0 0 24 24"><path stroke-width="2" stroke-linecap="round" fill-rule="evenodd" /></svg>'
    const jsx = convertHtmlToJsx(svg)
    expect(jsx).toContain('strokeWidth="2"')
    expect(jsx).toContain('strokeLinecap="round"')
    expect(jsx).toContain('fillRule="evenodd"')
  })

  it('wraps JSX in a functional component', () => {
    const html = '<div class="card"><h1>Title</h1></div>'
    const jsx = convertHtmlToJsx(html, { wrapComponent: true, componentName: 'Card' })
    expect(jsx).toContain('export default function Card()')
    expect(jsx).toContain('return (')
    expect(jsx).toContain('<div className="card">')
  })

  it('converts HTML to Vue template with self-closing tags and event handlers', () => {
    const html = '<button onclick="handleClick()"><img src="icon.png">Click me</button>'
    const vue = convertHtmlToVue(html, { wrapSfc: true })
    expect(vue).toContain('<script setup lang="ts">')
    expect(vue).toContain('<button @click="handleClick()"><img src="icon.png" />Click me</button>')
  })
})

describe('convertHtmlToJsx with an SVG', () => {
  const svg = '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke-width="2"/>'
    + '<path d="m9 12 2 2 4-4" stroke-linecap="round"/></svg>'

  it('converts the hyphenated SVG attributes', () => {
    const out = convertHtmlToJsx(svg)
    expect(out).toContain('strokeWidth="2"')
    expect(out).toContain('strokeLinecap="round"')
    expect(out).not.toContain('stroke-width')
  })

  it('spreads props on the root tag for an icon component', () => {
    const out = convertHtmlToJsx(svg, {
      wrapComponent: true,
      componentName: 'SvgIcon',
      spreadProps: true,
    })
    expect(out).toContain('export default function SvgIcon(props)')
    expect(out).toContain('<svg {...props}')
  })

  it('takes no props parameter when the spread is off', () => {
    const out = convertHtmlToJsx(svg, { wrapComponent: true, componentName: 'SvgIcon' })
    expect(out).toContain('export default function SvgIcon()')
    expect(out).not.toContain('{...props}')
  })

  it('does not match data-class as class', () => {
    const html = '<div data-class="custom" class="active">Hello</div>'
    const jsx = convertHtmlToJsx(html)
    expect(jsx).toContain('data-class="custom"')
    expect(jsx).toContain('className="active"')
    expect(jsx).not.toContain('data-className')
  })

  it('parses styles without splitting on semicolons inside url() or quotes', () => {
    const style = 'background: url(\'data:image/svg+xml;utf8,<svg></svg>\'); color: red'
    const jsxStyle = parseCssToJsxStyle(style)
    expect(jsxStyle).toContain('background: \'url(\\\'data:image/svg+xml;utf8,<svg></svg>\\\')\'')
    expect(jsxStyle).toContain('color: \'red\'')
  })
})
