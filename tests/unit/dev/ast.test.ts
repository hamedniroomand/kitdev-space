import { parseSync } from 'oxc-parser'
import { describe, expect, it } from 'vitest'
import {
  buildAstTree,
  collectImportSpecifiers,
  createLineStarts,
  createPositionMapper,
  createSpan,
  findAstNodeAtOffset,
  findAstPathAtOffset,
  languageToFilename,
  offsetToPosition,
  searchAstTypes,
  sliceSource,
} from '#shared/utils/dev/ast'

describe('createLineStarts', () => {
  it('records the offset of every line', () => {
    expect(createLineStarts('')).toEqual([0])
    expect(createLineStarts('a\nbc')).toEqual([0, 2])
    expect(createLineStarts('a\n')).toEqual([0, 2])
  })
})

describe('offsetToPosition', () => {
  it('maps offsets to line and column', () => {
    expect(offsetToPosition('a\nbc', 0)).toEqual({ line: 1, column: 1, offset: 0 })
    expect(offsetToPosition('a\nbc', 2)).toEqual({ line: 2, column: 1, offset: 2 })
    expect(createSpan('hi', 0, 2).end).toEqual({ line: 1, column: 3, offset: 2 })
  })

  it('holds the line at a newline and clamps out of range offsets', () => {
    expect(offsetToPosition('a\nbc', 1)).toEqual({ line: 1, column: 2, offset: 1 })
    expect(offsetToPosition('a\nbc', 4)).toEqual({ line: 2, column: 3, offset: 4 })
    expect(offsetToPosition('a\nbc', 99)).toEqual({ line: 2, column: 3, offset: 4 })
    expect(offsetToPosition('a\nbc', -5)).toEqual({ line: 1, column: 1, offset: 0 })
    expect(offsetToPosition('', 0)).toEqual({ line: 1, column: 1, offset: 0 })
    expect(offsetToPosition('a\n', 2)).toEqual({ line: 2, column: 1, offset: 2 })
  })

  it('agrees with a character scan on every offset', () => {
    const source = 'one\ntwo\n\nfour'
    const at = createPositionMapper(source)

    for (let offset = 0; offset <= source.length; offset += 1) {
      let line = 1
      let column = 1
      for (let i = 0; i < offset; i += 1) {
        if (source[i] === '\n') {
          line += 1
          column = 1
        }
        else {
          column += 1
        }
      }
      expect(at(offset)).toEqual({ line, column, offset })
    }
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

function parseTree(source: string, filename = 'input.ts') {
  const parsed = parseSync(filename, source, {
    lang: 'ts',
    sourceType: 'module',
    range: true,
  })
  return buildAstTree(parsed.program, source)
}

describe('findAstPathAtOffset', () => {
  it('finds the deepest node that contains the offset', () => {
    const source = 'const total = 1 + 2\n'
    const tree = parseTree(source)

    const path = findAstPathAtOffset(tree, source.indexOf('total'))
    expect(path[0]?.type).toBe('Program')
    expect(path.at(-1)).toMatchObject({ type: 'Identifier', label: 'total' })

    expect(findAstNodeAtOffset(tree, source.indexOf('2'))?.type).toBe('Literal')
    expect(findAstNodeAtOffset(null, 0)).toBeNull()
  })
})

describe('searchAstTypes', () => {
  it('marks nodes by type name and opens their parents', () => {
    const tree = parseTree('const total = 1\n')
    const found = searchAstTypes(tree, 'literal')
    const literal = findAstNodeAtOffset(tree, 14)

    expect(literal?.type).toBe('Literal')
    expect(found.matches.has(literal!.id)).toBe(true)
    expect(found.expand.has(tree!.id)).toBe(true)
    expect(found.matches.has(tree!.id)).toBe(false)
  })

  it('finds nothing for an empty query', () => {
    const tree = parseTree('const total = 1\n')
    expect(searchAstTypes(tree, '  ').matches.size).toBe(0)
    expect(searchAstTypes(null, 'Program').matches.size).toBe(0)
  })
})

describe('large source performance', () => {
  function makeSource(target: number): string {
    const unit = [
      'export function fn$I(a$I: number, b$I: string) {',
      '  const value = a$I + Number(b$I)',
      '  return { value, label: b$I.repeat(2) }',
      '}',
      '',
    ].join('\n')

    let out = ''
    let index = 0
    while (out.length < target) {
      out += unit.replaceAll('$I', String(index))
      index += 1
    }
    // A cut inside a token would break the parse, so pad with a comment.
    return `${out}// ${'x'.repeat(Math.max(target - out.length, 1))}\n`
  }

  it('parses and maps a 200,000 character source in under 500 ms', () => {
    const source = makeSource(200_000)
    expect(source.length).toBeGreaterThanOrEqual(200_000)

    const started = performance.now()
    const parsed = parseSync('input.ts', source, {
      lang: 'ts',
      sourceType: 'module',
      range: true,
    })
    const tree = buildAstTree(parsed.program, source)
    const elapsed = performance.now() - started

    expect(parsed.errors).toHaveLength(0)
    expect(tree?.children.length).toBeGreaterThan(1000)
    expect(elapsed).toBeLessThan(500)
  })
})
