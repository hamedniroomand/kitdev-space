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
})
