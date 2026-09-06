import { describe, expect, it } from 'bun:test'
import {
  parseSourceAst,
  resolveSpecifiers,
  transformSourceAst,
} from '#server/utils/dev/ast'

describe('parseSourceAst', () => {
  it('parses typescript into an ESTree tree', () => {
    const result = parseSourceAst(
      'import { join } from "node:path"\nexport const x: number = 1\n',
      'typescript',
    )
    expect(result.filename).toBe('input.ts')
    expect(result.tree.type).toBe('Program')
    expect(result.imports).toContain('node:path')
    expect(result.errors).toEqual([])
    expect(JSON.stringify(result.program)).toContain('ImportDeclaration')
  })

  it('parses jsx', () => {
    const result = parseSourceAst('const el = <div>Hi</div>', 'jsx')
    expect(result.tree.type).toBe('Program')
    expect(JSON.stringify(result.program)).toContain('JSXElement')
  })
})

describe('transformSourceAst', () => {
  it('transforms typescript and jsx with oxc-transform', () => {
    const result = transformSourceAst(
      'export const x: number = 1\nconst el = <span />\n',
      'tsx',
    )
    expect(result.code).not.toContain(': number')
    expect(result.code.length).toBeGreaterThan(0)
  })
})

describe('resolveSpecifiers', () => {
  it('resolves installed packages with esm rules', () => {
    const rows = resolveSpecifiers({
      mode: 'esm',
      specifiers: ['oxc-parser', './package.json'],
    })
    expect(rows[0]?.ok).toBe(true)
    expect(rows[0]?.path).toContain('oxc-parser')
    expect(rows[1]?.ok).toBe(true)
    expect(rows[1]?.path).toContain('package.json')
  })

  it('reports missing modules', () => {
    const rows = resolveSpecifiers({
      mode: 'node',
      specifiers: ['./definitely-missing-module-xyz'],
    })
    expect(rows[0]?.ok).toBe(false)
    expect(rows[0]?.error).toBeTruthy()
  })
})
