import { describe, expect, it } from 'vitest'
import { canFormatInBrowser, formatInBrowser, minifyHtml } from '#shared/utils/dev/code-format'

describe('canFormatInBrowser', () => {
  it('accepts json, html minify, and css minify', () => {
    expect(canFormatInBrowser('json', 'minify')).toBe(true)
    expect(canFormatInBrowser('json', 'beautify')).toBe(true)
    expect(canFormatInBrowser('html', 'minify')).toBe(true)
    expect(canFormatInBrowser('css', 'minify')).toBe(true)
  })

  it('rejects the work that needs the server', () => {
    expect(canFormatInBrowser('javascript', 'minify')).toBe(false)
    expect(canFormatInBrowser('typescript', 'minify')).toBe(false)
    expect(canFormatInBrowser('html', 'beautify')).toBe(false)
    expect(canFormatInBrowser('css', 'beautify')).toBe(false)
  })
})

describe('minifyHtml', () => {
  it('strips comments and collapses whitespace between tags', () => {
    expect(minifyHtml('<div>  <!-- note -->  <span>Hi</span>  </div>'))
      .toBe('<div><span>Hi</span></div>')
  })

  it('preserves formatting inside pre, textarea, script, and style blocks', () => {
    const raw = '<div> <pre>  line 1 \n   line 2  </pre>  <textarea>  preserve   spaces  </textarea> </div>'
    const expected = '<div><pre>  line 1 \n   line 2  </pre><textarea>  preserve   spaces  </textarea></div>'
    expect(minifyHtml(raw)).toBe(expected)
  })
})

describe('formatInBrowser', () => {
  it('minifies json', async () => {
    const result = await formatInBrowser('{\n  "a": 1\n}', 'json', 'minify')
    expect(result).toEqual({ code: '{"a":1}', engine: 'json' })
  })

  it('beautifies json', async () => {
    const result = await formatInBrowser('{"a":1}', 'json', 'beautify')
    expect(result.engine).toBe('json')
    expect(result.code).toContain('"a": 1')
  })

  it('minifies css with csso', async () => {
    const result = await formatInBrowser('body { color: red; }', 'css', 'minify')
    expect(result).toEqual({ code: 'body{color:red}', engine: 'csso' })
  })

  it('minifies html', async () => {
    const result = await formatInBrowser('<div><span>Hi</span></div>', 'html', 'minify')
    expect(result.engine).toBe('html')
    expect(result.code).toBe('<div><span>Hi</span></div>')
  })

  it('rejects empty input', async () => {
    await expect(formatInBrowser('   ', 'json', 'minify')).rejects.toThrow('Enter source code')
  })

  it('refuses the work that needs the server', async () => {
    await expect(formatInBrowser('const a=1', 'javascript', 'minify')).rejects.toThrow(/server/)
  })
})
