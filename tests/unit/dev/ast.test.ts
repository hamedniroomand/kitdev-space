import { describe, expect, it } from 'vitest'
import {
  buildAstTree,
  collectImportSpecifiers,
  createSpan,
  languageToFilename,
  offsetToPosition,
  sliceSource,
} from '#shared/utils/dev/ast'

describe('offsetToPosition', () => {
  it('maps offsets to line and column', () => {
    expect(offsetToPosition('a\nbc', 0)).toEqual({ line: 1, column: 1, offset: 0 })
    expect(offsetToPosition('a\nbc', 2)).toEqual({ line: 2, column: 1, offset: 2 })
    expect(createSpan('hi', 0, 2).end).toEqual({ line: 1, column: 3, offset: 2 })
  })
})

describe('buildAstTree', () => {
  it('builds a compact tree with spans', () => {
    const program = {
      type: 'Program',
      start: 0,
      end: 11,
      body: [
        {
          type: 'ExpressionStatement',
          start: 0,
          end: 11,
          expression: {
            type: 'Identifier',
            name: 'hello',
            start: 0,
            end: 5,
          },
        },
      ],
    }

    const tree = buildAstTree(program, 'hello world')
    expect(tree?.type).toBe('Program')
    expect(tree?.children[0]?.type).toBe('ExpressionStatement')
    expect(tree?.children[0]?.children[0]).toMatchObject({
      type: 'Identifier',
      label: 'hello',
      start: 0,
      end: 5,
    })
    expect(sliceSource('hello world', 0, 5)).toBe('hello')
  })
})

describe('collectImportSpecifiers', () => {
  it('collects import and require specifiers', () => {
    const program = {
      type: 'Program',
      body: [
        {
          type: 'ImportDeclaration',
          source: { type: 'Literal', value: 'oxc-parser' },
        },
        {
          type: 'ExpressionStatement',
          expression: {
            type: 'CallExpression',
            callee: { type: 'Identifier', name: 'require' },
            arguments: [{ type: 'Literal', value: 'node:fs' }],
          },
        },
      ],
    }

    expect(collectImportSpecifiers(program)).toEqual(['oxc-parser', 'node:fs'])
  })
})

describe('languageToFilename', () => {
  it('maps languages to filenames', () => {
    expect(languageToFilename('tsx')).toBe('input.tsx')
    expect(languageToFilename('javascript')).toBe('input.js')
  })
})
