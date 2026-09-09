// @vitest-environment happy-dom
// The converter needs the `DOMParser` of a browser. happy-dom gives one.
import type { JsxConvertOptions, VueConvertOptions } from '#shared/utils/dev/html-converter'
import { describe, expect, it } from 'vitest'
import {
  canConvertInBrowser,
  convertHtmlToJsx,
  convertHtmlToVue,
  parseCssToJsxStyle,
  splitCssDeclarations,
} from '#shared/utils/dev/html-converter'

function jsx(html: string, options: JsxConvertOptions = {}) {
  return convertHtmlToJsx(html, options).code
}

function vue(html: string, options: VueConvertOptions = {}) {
  return convertHtmlToVue(html, options).code
}

describe('html-converter environment', () => {
  it('finds the DOMParser of the test environment', () => {
    expect(canConvertInBrowser()).toBe(true)
  })

  it('returns an empty result for empty input', () => {
    expect(convertHtmlToJsx('   ')).toEqual({ code: '', notes: [] })
    expect(convertHtmlToVue('')).toEqual({ code: '', notes: [] })
  })
})

describe('convertHtmlToJsx attributes', () => {
  it('renames class and for', () => {
    expect(jsx('<label class="form-label" for="email-input">Email</label>'))
      .toBe('<label className="form-label" htmlFor="email-input">Email</label>')
  })

  it('renames the hyphenated SVG attributes', () => {
    const out = jsx('<svg viewBox="0 0 24 24"><path stroke-width="2" stroke-linecap="round" fill-rule="evenodd" /></svg>')
    expect(out).toContain('viewBox="0 0 24 24"')
    expect(out).toContain('strokeWidth="2"')
    expect(out).toContain('strokeLinecap="round"')
    expect(out).toContain('fillRule="evenodd"')
    expect(out).not.toContain('stroke-width')
  })

  it('keeps a data attribute and an aria attribute byte-identical', () => {
    const out = jsx('<div data-class="custom" data-value="A B" aria-label="Close" class="active"></div>')
    expect(out).toContain('data-class="custom"')
    expect(out).toContain('data-value="A B"')
    expect(out).toContain('aria-label="Close"')
    expect(out).toContain('className="active"')
    expect(out).not.toContain('data-className')
  })

  it('reads an attribute value that holds a greater-than sign', () => {
    const out = jsx('<div title="a > b" class="x">ok</div>')
    expect(out).toBe('<div title="a > b" className="x">ok</div>')
  })

  it('writes an attribute with no value as a bare attribute', () => {
    expect(jsx('<input disabled>')).toBe('<input disabled />')
  })

  it('renames checked and value on a form control', () => {
    const out = jsx('<input type="checkbox" checked value="yes">')
    expect(out).toContain('defaultChecked')
    expect(out).toContain('defaultValue="yes"')
    expect(out).not.toContain('checked=')
  })

  it('keeps value on an element that is not a form control', () => {
    expect(jsx('<li value="3">Item</li>')).toBe('<li value="3">Item</li>')
  })

  it('names a selected option instead of writing an invalid prop', () => {
    const result = convertHtmlToJsx('<select><option selected>A</option></select>')
    expect(result.code).not.toContain('selected')
    expect(result.notes).toEqual([
      { kind: 'attribute', detail: 'selected on <option>: set defaultValue on the <select>' },
    ])
  })

  it('drops an event handler and names it with its value', () => {
    const result = convertHtmlToJsx('<button onclick="saveProfile()">Save</button>')
    expect(result.code).toBe('<button>Save</button>')
    expect(result.notes).toEqual([
      { kind: 'event', detail: 'onclick on <button>: saveProfile()' },
    ])
  })

  it('renames a namespaced SVG attribute that JSX knows', () => {
    const out = jsx('<svg><use xlink:href="#icon" xml:space="preserve" /></svg>')
    expect(out).toContain('xlinkHref="#icon"')
    expect(out).toContain('xmlSpace="preserve"')
  })

  it('drops a namespaced attribute that JSX has no name for and names it', () => {
    const result = convertHtmlToJsx('<svg><path sodipodi:role="line" d="M0 0" /></svg>')
    expect(result.code).not.toContain('sodipodi')
    expect(result.notes[0]).toEqual({
      kind: 'attribute',
      detail: 'sodipodi:role on <path>: JSX has no name for it',
    })
  })
})

describe('convertHtmlToJsx structure', () => {
  it('closes a void tag and an unclosed tag', () => {
    expect(jsx('<div><img src="avatar.png"><br><input type="text"></div>'))
      .toBe('<div><img src="avatar.png" /><br /><input type="text" /></div>')
  })

  it('closes an unclosed element', () => {
    expect(jsx('<div><p>Text')).toBe('<div><p>Text</p></div>')
  })

  it('keeps a self-closing SVG tag closed', () => {
    expect(jsx('<svg><circle cx="1" /></svg>')).toBe('<svg><circle cx="1" /></svg>')
  })

  it('wraps several root elements in a fragment', () => {
    expect(jsx('<h1>A</h1><p>B</p>')).toBe('<><h1>A</h1><p>B</p></>')
  })

  it('keeps one root element without a fragment', () => {
    expect(jsx('<h1>A</h1>')).toBe('<h1>A</h1>')
  })

  it('names a doctype instead of writing it', () => {
    const result = convertHtmlToJsx('<!DOCTYPE html><p>A</p>')
    expect(result.code).toBe('<p>A</p>')
    expect(result.notes).toEqual([{ kind: 'doctype', detail: '<!DOCTYPE html>' }])
  })

  it('drops a script block and names it', () => {
    const result = convertHtmlToJsx('<div><script src="a.js"></script><script>var a = 1 < 2;</script>Text</div>')
    expect(result.code).toBe('<div>Text</div>')
    expect(result.notes).toEqual([
      { kind: 'script', detail: '<script src="a.js">' },
      { kind: 'script', detail: '<script> block' },
    ])
  })

  it('writes a style block as a template literal', () => {
    const result = convertHtmlToJsx('<div><style>.a { color: red }</style></div>')
    expect(result.code).toBe('<div><style>{`.a { color: red }`}</style></div>')
    expect(result.notes).toEqual([])
  })

  it('converts a comment and neutralizes a comment end inside it', () => {
    expect(jsx('<div><!-- Header navigation --><span>Hello</span></div>'))
      .toBe('<div>{/* Header navigation */}<span>Hello</span></div>')
    expect(jsx('<div><!-- a */ b --></div>')).toBe('<div>{/* a *\\/ b */}</div>')
  })

  it('keeps the namespace attributes of an SVG root', () => {
    const out = jsx('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"></svg>')
    expect(out).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(out).toContain('xmlnsXlink="http://www.w3.org/1999/xlink"')
  })

  it('keeps the case of an SVG element name', () => {
    const out = jsx('<svg><linearGradient id="g"><stop stop-color="#fff" /></linearGradient><feGaussianBlur /></svg>')
    expect(out).toContain('<linearGradient id="g">')
    expect(out).toContain('stopColor="#fff"')
    expect(out).toContain('<feGaussianBlur />')
  })
})

describe('convertHtmlToJsx text', () => {
  it('escapes a curly brace in text', () => {
    expect(jsx('<p>Use {value} here</p>')).toBe('<p>Use &#123;value&#125; here</p>')
  })

  it('writes a non-breaking space as an entity', () => {
    expect(jsx('<p>a&nbsp;b</p>')).toBe('<p>a&nbsp;b</p>')
  })

  it('escapes an ampersand and an angle bracket in text', () => {
    expect(jsx('<p>a &amp; b &lt; c</p>')).toBe('<p>a &amp; b &lt; c</p>')
  })
})

describe('convertHtmlToJsx component wrapper', () => {
  const svg = '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke-width="2"/>'
    + '<path d="m9 12 2 2 4-4" stroke-linecap="round"/></svg>'

  it('wraps the markup in a function component', () => {
    const out = jsx('<div class="card"><h1>Title</h1></div>', { wrapComponent: true, componentName: 'Card' })
    expect(out).toContain('export default function Card()')
    expect(out).toContain('return (')
    expect(out).toContain('<div className="card">')
  })

  it('spreads props on the root tag', () => {
    const out = jsx(svg, { wrapComponent: true, componentName: 'SvgIcon', spreadProps: true })
    expect(out).toContain('export default function SvgIcon(props)')
    expect(out).toContain('<svg {...props} viewBox="0 0 24 24"')
  })

  it('takes no props parameter when the spread is off', () => {
    const out = jsx(svg, { wrapComponent: true, componentName: 'SvgIcon' })
    expect(out).toContain('export default function SvgIcon()')
    expect(out).not.toContain('{...props}')
  })

  it('exposes the SVG title as a prop', () => {
    const out = jsx(svg, {
      wrapComponent: true,
      componentName: 'SvgIcon',
      spreadProps: true,
      titleProp: true,
    })
    expect(out).toContain('export default function SvgIcon({ title, ...props })')
    expect(out).toContain('{title ? <title>{title}</title> : null}')
  })

  it('takes no title parameter when the root is not an SVG', () => {
    const out = jsx('<div class="card">A</div>', {
      wrapComponent: true,
      componentName: 'Card',
      titleProp: true,
    })
    expect(out).toContain('export default function Card()')
    expect(out).not.toContain('title')
  })

  it('replaces an existing title element with the prop', () => {
    const out = jsx('<svg><title>Star</title><path d="M0 0" /></svg>', {
      wrapComponent: true,
      componentName: 'SvgIcon',
      titleProp: true,
    })
    expect(out).toContain('export default function SvgIcon({ title })')
    expect(out).toContain('{title ? <title>{title}</title> : null}')
    expect(out).not.toContain('Star')
  })
})

describe('convertHtmlToJsx duplicate ids', () => {
  const twoIcons = '<svg viewBox="0 0 24 24">'
    + '<defs><linearGradient id="grad"><stop stop-color="#fff" /></linearGradient>'
    + '<clipPath id="clip"><rect width="10" height="10" /></clipPath></defs>'
    + '<rect fill="url(#grad)" clip-path="url(#clip)" width="24" height="24" />'
    + '</svg>'
    + '<svg viewBox="0 0 24 24">'
    + '<defs><linearGradient id="grad"><stop stop-color="#000" /></linearGradient>'
    + '<clipPath id="clip"><rect width="20" height="20" /></clipPath></defs>'
    + '<rect fill="url(#grad)" clip-path="url(#clip)" width="24" height="24" />'
    + '</svg>'

  it('renames a duplicate gradient id and its reference', () => {
    const out = jsx(twoIcons)
    expect(out).toContain('<linearGradient id="grad">')
    expect(out).toContain('<linearGradient id="grad-2">')
    expect(out).toContain('fill="url(#grad)"')
    expect(out).toContain('fill="url(#grad-2)"')
  })

  it('renames a duplicate clip path id and its reference', () => {
    const out = jsx(twoIcons)
    expect(out).toContain('<clipPath id="clip">')
    expect(out).toContain('<clipPath id="clip-2">')
    expect(out).toContain('clipPath="url(#clip)"')
    expect(out).toContain('clipPath="url(#clip-2)"')
  })

  it('keeps the reference of the first SVG as it is', () => {
    const out = jsx(twoIcons)
    const first = out.slice(0, out.indexOf('</svg>'))
    expect(first).toContain('url(#grad)')
    expect(first).not.toContain('grad-2')
  })

  it('rewrites an href reference and a filter reference', () => {
    const html = '<svg><path id="p" d="M0 0" /><use href="#p" /></svg>'
      + '<svg><path id="p" d="M1 1" /><use href="#p" /><filter id="f" /><rect filter="url(#f)" /></svg>'
    const out = jsx(html)
    expect(out).toContain('<path id="p-2" d="M1 1" />')
    expect(out).toContain('href="#p-2"')
    expect(out).toContain('id="f"')
    expect(out).toContain('filter="url(#f)"')
  })

  it('rewrites the begin and end of an animation element', () => {
    const html = '<svg><rect id="go" /><animate begin="go.click" end="go.mouseout" /></svg>'
      + '<svg><rect id="go" /><animate begin="go.click; go.focus" end="go.mouseout" /></svg>'
    const out = jsx(html)
    expect(out).toContain('begin="go-2.click; go-2.focus"')
    expect(out).toContain('end="go-2.mouseout"')
    expect(out).toContain('begin="go.click"')
  })

  it('keeps an aria reference and a data value out of the rewrite', () => {
    const html = '<svg><title id="t">A</title><rect aria-labelledby="t" data-ref="#t" /></svg>'
      + '<svg><title id="t">B</title><rect aria-labelledby="t" data-ref="#t" /></svg>'
    const out = jsx(html)
    expect(out).toContain('id="t-2"')
    expect(out.match(/aria-labelledby="t"/g)).toHaveLength(2)
    expect(out.match(/data-ref="#t"/g)).toHaveLength(2)
  })
})

describe('convertHtmlToJsx inline style', () => {
  it('converts an inline style to an object', () => {
    expect(jsx('<div style="color: red; font-size: 14px"></div>'))
      .toBe('<div style={{ color: \'red\', fontSize: \'14px\' }} />')
  })

  it('rewrites a duplicate id reference inside an inline style', () => {
    const html = '<svg><linearGradient id="g" /><rect style="fill: url(#g)" /></svg>'
      + '<svg><linearGradient id="g" /><rect style="fill: url(#g)" /></svg>'
    const out = jsx(html)
    expect(out).toContain('style={{ fill: \'url(#g)\' }}')
    expect(out).toContain('style={{ fill: \'url(#g-2)\' }}')
  })

  it('names a style declaration that it cannot read', () => {
    const result = convertHtmlToJsx('<div style="color: red; font-weight"></div>')
    expect(result.code).toContain('style={{ color: \'red\' }}')
    expect(result.notes).toEqual([{ kind: 'style', detail: 'font-weight on <div>' }])
  })

  it('parses a style string with a custom property', () => {
    const style = 'color: red; font-size: 14px; margin-top: 20px; --custom-bg: #fff'
    expect(parseCssToJsxStyle(style))
      .toBe('style={{ color: \'red\', fontSize: \'14px\', marginTop: \'20px\', \'--custom-bg\': \'#fff\' }}')
  })

  it('does not split on a semicolon inside url() or quotes', () => {
    const style = 'background: url(\'data:image/svg+xml;utf8,<svg></svg>\'); color: red'
    const jsxStyle = parseCssToJsxStyle(style)
    expect(jsxStyle).toContain('background: \'url(\\\'data:image/svg+xml;utf8,<svg></svg>\\\')\'')
    expect(jsxStyle).toContain('color: \'red\'')
  })

  it('splits declarations and keeps a url() together', () => {
    expect(splitCssDeclarations('a: 1; b: url(x;y); c: 2')).toEqual(['a: 1', 'b: url(x;y)', 'c: 2'])
  })
})

describe('convertHtmlToVue', () => {
  it('converts an inline event handler and closes a void tag', () => {
    const out = vue('<button onclick="handleClick()"><img src="icon.png">Click me</button>', { wrapSfc: true })
    expect(out).toContain('<script setup lang="ts">')
    expect(out).toContain('<button @click="handleClick()"><img src="icon.png" />Click me</button>')
    expect(out).toContain('</template>')
  })

  it('keeps class, style, and a data attribute as they are', () => {
    expect(vue('<div class="card" style="color: red" data-id="1">A</div>'))
      .toBe('<div class="card" style="color: red" data-id="1">A</div>')
  })

  it('keeps several root elements without a fragment', () => {
    expect(vue('<h1>A</h1><p>B</p>')).toBe('<h1>A</h1><p>B</p>')
  })

  it('keeps an HTML comment', () => {
    expect(vue('<div><!-- note --></div>')).toBe('<div><!-- note --></div>')
  })

  it('escapes a double curly brace in text', () => {
    expect(vue('<p>{{ value }}</p>')).toBe('<p>&#123;&#123; value &#125;&#125;</p>')
  })

  it('drops a script block and names it', () => {
    const result = convertHtmlToVue('<div><script>var a = 1;</script>Text</div>')
    expect(result.code).toBe('<div>Text</div>')
    expect(result.notes).toEqual([{ kind: 'script', detail: '<script> block' }])
  })

  it('renames a duplicate id and its reference', () => {
    const html = '<svg><linearGradient id="g" /><rect fill="url(#g)" /></svg>'
      + '<svg><linearGradient id="g" /><rect fill="url(#g)" /></svg>'
    const out = vue(html)
    expect(out).toContain('<linearGradient id="g-2" />')
    expect(out).toContain('fill="url(#g-2)"')
  })
})
