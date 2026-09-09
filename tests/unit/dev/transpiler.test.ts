import { describe, expect, it } from 'vitest'
import { transpileSource } from '../../../shared/utils/dev/transpile'

describe('transpileSource', () => {
  it('strips types', async () => {
    const out = await transpileSource('const x: number = 1', 'ts')
    expect(out.code).toContain('const x')
    expect(out.code).not.toContain(': number')
  })

  it('transpiles jsx', async () => {
    const out = await transpileSource('export const App = () => <div />', 'tsx')
    expect(out.code.length).toBeGreaterThan(0)
    expect(out.code).toContain('React.createElement')
  })

  it('rejects empty input', async () => {
    await expect(transpileSource('', 'ts')).rejects.toThrow('Enter source code before you run the tool.')
  })

  it('throws on syntax error', async () => {
    await expect(transpileSource('const x = ;', 'ts')).rejects.toThrow('Syntax error')
  })

  it('accepts code with a type error', async () => {
    const out = await transpileSource('const x: number = "text"', 'ts')
    expect(out.code).toContain('"text"')
  })

  it('compiles the newer syntax by default', async () => {
    const out = await transpileSource('const a = b?.c ?? d', 'ts')
    expect(out.code).not.toContain('?.')
    expect(out.code).not.toContain('??')
  })

  it('keeps the newer syntax when asked', async () => {
    const out = await transpileSource('const a = b?.c ?? d', 'ts', { newSyntax: 'keep' })
    expect(out.code).toContain('b?.c ?? d')
  })

  it('uses the automatic jsx runtime', async () => {
    const out = await transpileSource('export const App = () => <div />', 'tsx', {
      jsxRuntime: 'automatic',
    })
    expect(out.code).toContain('react/jsx-dev-runtime')
    expect(out.code).not.toContain('React.createElement')
  })

  it('reads a custom jsx import source', async () => {
    const out = await transpileSource('export const App = () => <div />', 'tsx', {
      jsxRuntime: 'automatic',
      jsxImportSource: 'preact',
    })
    expect(out.code).toContain('preact/jsx-dev-runtime')
  })

  it('ignores the jsx options without a jsx loader', async () => {
    const out = await transpileSource('const x: number = 1', 'ts', {
      jsxRuntime: 'automatic',
      jsxImportSource: 'preact',
    })
    expect(out.code).toContain('const x')
  })

  it('keeps react when the jsx import source is empty', async () => {
    const out = await transpileSource('export const App = () => <div />', 'tsx', {
      jsxRuntime: 'automatic',
      jsxImportSource: '   ',
    })
    expect(out.code).toContain('react/jsx-dev-runtime')
  })
})
