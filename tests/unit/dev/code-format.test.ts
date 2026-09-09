import { describe, expect, it } from 'vitest'
import {
  canFormatInBrowser,
  canMinify,
  downloadFileName,
  formatInBrowser,
  measureBytes,
  minifyHtml,
} from '#shared/utils/dev/code-format'

describe('canFormatInBrowser', () => {
  it('accepts all beautify, and json, html, css minify', () => {
    expect(canFormatInBrowser('json', 'minify')).toBe(true)
    expect(canFormatInBrowser('json', 'beautify')).toBe(true)
    expect(canFormatInBrowser('html', 'minify')).toBe(true)
    expect(canFormatInBrowser('html', 'beautify')).toBe(true)
    expect(canFormatInBrowser('css', 'minify')).toBe(true)
    expect(canFormatInBrowser('css', 'beautify')).toBe(true)
    expect(canFormatInBrowser('javascript', 'beautify')).toBe(true)
    expect(canFormatInBrowser('typescript', 'beautify')).toBe(true)
    expect(canFormatInBrowser('sql', 'beautify')).toBe(true)
    expect(canFormatInBrowser('vue', 'beautify')).toBe(true)
  })

  it('rejects js/ts minify that needs the server', () => {
    expect(canFormatInBrowser('javascript', 'minify')).toBe(false)
    expect(canFormatInBrowser('typescript', 'minify')).toBe(false)
  })
})

describe('canMinify', () => {
  it('accepts the languages that compress', () => {
    expect(canMinify('javascript')).toBe(true)
    expect(canMinify('typescript')).toBe(true)
    expect(canMinify('html')).toBe(true)
    expect(canMinify('css')).toBe(true)
    expect(canMinify('json')).toBe(true)
  })

  it('rejects the format only languages', () => {
    expect(canMinify('vue')).toBe(false)
    expect(canMinify('scss')).toBe(false)
    expect(canMinify('markdown')).toBe(false)
    expect(canMinify('yaml')).toBe(false)
    expect(canMinify('graphql')).toBe(false)
    expect(canMinify('sql')).toBe(false)
  })
})

describe('downloadFileName', () => {
  it('adds min for minify and pretty for beautify', () => {
    expect(downloadFileName('app.js', 'minify', 'js')).toBe('app.min.js')
    expect(downloadFileName('app.js', 'beautify', 'js')).toBe('app.pretty.js')
  })

  it('replaces the suffix of a name that carries one', () => {
    expect(downloadFileName('app.min.js', 'beautify', 'js')).toBe('app.pretty.js')
    expect(downloadFileName('app.pretty.js', 'minify', 'js')).toBe('app.min.js')
  })

  it('keeps every other dot of the name', () => {
    expect(downloadFileName('my.component.spec.ts', 'minify', 'ts')).toBe('my.component.spec.min.ts')
  })

  it('uses the language extension when the name has none', () => {
    expect(downloadFileName('README', 'beautify', 'md')).toBe('README.pretty.md')
  })

  it('falls back to a generic name when no file loaded the code', () => {
    expect(downloadFileName(null, 'minify', 'css')).toBe('minified.css')
    expect(downloadFileName('  ', 'beautify', 'css')).toBe('formatted.css')
  })
})

describe('measureBytes', () => {
  it('counts raw bytes, gzipped bytes, and the reduction', () => {
    const input = `${'a'.repeat(500)}\n`.repeat(4)
    const output = 'a'.repeat(500)
    const delta = measureBytes(input, output)

    expect(delta.inputBytes).toBe(2004)
    expect(delta.outputBytes).toBe(500)
    expect(delta.gzipBytes).toBeGreaterThan(0)
    expect(delta.gzipBytes).toBeLessThan(delta.outputBytes)
    expect(delta.reductionPercent).toBe(75)
  })

  it('counts a multi byte character as more than one byte', () => {
    expect(measureBytes('', 'é').outputBytes).toBe(2)
  })

  it('reports a negative reduction when the output grows', () => {
    expect(measureBytes('a', 'aaaa').reductionPercent).toBe(-300)
  })

  it('returns zero for an empty output', () => {
    expect(measureBytes('', '')).toEqual({
      inputBytes: 0,
      outputBytes: 0,
      gzipBytes: 0,
      reductionPercent: 0,
    })
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

  it('beautifies javascript with prettier', async () => {
    const result = await formatInBrowser('const a=1+2;', 'javascript', 'beautify')
    expect(result.engine).toBe('prettier')
    expect(result.code).toContain('const a = 1 + 2;')
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

  it('beautifies a vue file, with the script and the style block', async () => {
    const raw = '<template><div   class="a">{{  msg }}</div></template>\n<script setup>const  a=1</script>\n<style>.a{color:red}</style>'
    const result = await formatInBrowser(raw, 'vue', 'beautify')
    expect(result.engine).toBe('prettier')
    expect(result.code).toContain('<div class="a">{{ msg }}</div>')
    expect(result.code).toContain('const a = 1;')
    expect(result.code).toContain('color: red;')
  })

  it('beautifies scss', async () => {
    const result = await formatInBrowser('$c:red;.a{ .b{color:$c} }', 'scss', 'beautify')
    expect(result.code).toContain('$c: red;')
    expect(result.code).toContain('color: $c;')
  })

  it('beautifies markdown', async () => {
    const result = await formatInBrowser('#  Title\n\n*  item\n', 'markdown', 'beautify')
    expect(result.code).toContain('# Title')
    expect(result.code).toContain('- item')
  })

  it('beautifies yaml', async () => {
    const result = await formatInBrowser('a:   1\nb:\n - x\n', 'yaml', 'beautify')
    expect(result.code).toContain('a: 1')
    expect(result.code).toContain('  - x')
  })

  it('beautifies graphql', async () => {
    const result = await formatInBrowser('query   Q { user( id : 1 ) { name } }', 'graphql', 'beautify')
    expect(result.code).toContain('query Q {')
    expect(result.code).toContain('user(id: 1) {')
  })

  it('beautifies sql with sql-formatter', async () => {
    const result = await formatInBrowser('SELECT a,b FROM t WHERE a=1', 'sql', 'beautify')
    expect(result.engine).toBe('sql-formatter')
    expect(result.code).toContain('SELECT\n  a,\n  b')
    expect(result.code).toContain('WHERE\n  a = 1')
  })

  it('applies the indentation and the quote choice', async () => {
    const result = await formatInBrowser('const a="x";', 'javascript', 'beautify', {
      tabWidth: 4,
      useTabs: false,
      singleQuote: true,
    })
    expect(result.code).toContain('const a = \'x\';')

    const nested = await formatInBrowser('function f(){return 1}', 'javascript', 'beautify', {
      tabWidth: 4,
      useTabs: false,
      singleQuote: false,
    })
    expect(nested.code).toContain('\n    return 1;')
  })

  it('indents with a tab when the user asks for tabs', async () => {
    const style = { tabWidth: 2, useTabs: true, singleQuote: false }

    const script = await formatInBrowser('function f(){return 1}', 'javascript', 'beautify', style)
    expect(script.code).toContain('\n\treturn 1;')

    const json = await formatInBrowser('{"a":1}', 'json', 'beautify', style)
    expect(json.code).toContain('\n\t"a": 1')

    const sql = await formatInBrowser('SELECT a,b FROM t', 'sql', 'beautify', style)
    expect(sql.code).toContain('\n\ta,')
  })

  it('rejects empty input', async () => {
    await expect(formatInBrowser('   ', 'json', 'minify')).rejects.toThrow('Enter source code')
  })

  it('refuses the work that needs the server', async () => {
    await expect(formatInBrowser('const a=1', 'javascript', 'minify')).rejects.toThrow(/server/)
  })
})
