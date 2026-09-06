import { describe, expect, it } from 'bun:test'
import { transpileSource } from '#server/utils/dev/transpile'

describe('transpileSource', () => {
  it('strips types', () => {
    const out = transpileSource('const x: number = 1', 'ts')
    expect(out.code).toContain('const x')
    expect(out.code).not.toContain(': number')
  })

  it('transpiles jsx', () => {
    const out = transpileSource('export const App = () => <div />', 'tsx')
    expect(out.code.length).toBeGreaterThan(0)
  })
})
