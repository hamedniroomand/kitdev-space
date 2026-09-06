import { describe, expect, it } from 'bun:test'
import { processCode } from '#server/utils/dev/code-format'

describe('processCode', () => {
  it('minifies javascript with oxc', async () => {
    const result = await processCode(
      'const helloWorld = "a" + "b"; console.log(helloWorld);',
      'javascript',
      'minify'
    )
    expect(result.engine).toBe('oxc-minify')
    expect(result.code.length).toBeLessThan(60)
    expect(result.code).toContain('console.log')
  })

  it('minifies typescript after stripping types', async () => {
    const result = await processCode(
      'const helloWorld: string = "a" + "b"; console.log(helloWorld);',
      'typescript',
      'minify'
    )
    expect(result.engine).toBe('oxc-minify')
    expect(result.code).not.toContain(': string')
    expect(result.code).toContain('console.log')
  })

  it('beautifies javascript with prettier', async () => {
    const result = await processCode('const x=1;const y=2;', 'javascript', 'beautify')
    expect(result.engine).toBe('prettier')
    expect(result.code).toContain('const x = 1')
  })

  it('minifies css with csso', async () => {
    const result = await processCode('body { color: red; }', 'css', 'minify')
    expect(result.engine).toBe('csso')
    expect(result.code).toBe('body{color:red}')
  })

  it('beautifies html with prettier', async () => {
    const result = await processCode('<div><span>Hi</span></div>', 'html', 'beautify')
    expect(result.engine).toBe('prettier')
    expect(result.code).toContain('<div>')
    expect(result.code).toContain('<span>')
  })

  it('minifies json', async () => {
    const result = await processCode('{\n  "a": 1\n}', 'json', 'minify')
    expect(result.engine).toBe('json')
    expect(result.code).toBe('{"a":1}')
  })

  it('rejects empty input', async () => {
    await expect(processCode('   ', 'javascript', 'minify')).rejects.toThrow('Enter source code')
  })
})
