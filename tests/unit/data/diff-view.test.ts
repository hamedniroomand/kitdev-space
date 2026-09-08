import type { DiffLine } from '#shared/utils/data/diff'
import { describe, expect, it } from 'vitest'
import {
  buildDiffViewItems,
  computeCollapsibleSections,
  findDiffChunks,
} from '#shared/utils/data/diff-view'

function makeLines(types: Array<'equal' | 'insert' | 'delete'>): DiffLine[] {
  let oldLine = 1
  let newLine = 1
  return types.map((type, i) => {
    const item: DiffLine = {
      type,
      text: `line-${i + 1}`,
      oldLine: type === 'insert' ? null : oldLine++,
      newLine: type === 'delete' ? null : newLine++,
    }
    return item
  })
}

describe('findDiffChunks', () => {
  it('returns empty array when all lines are equal', () => {
    const lines = makeLines(['equal', 'equal', 'equal'])
    expect(findDiffChunks(lines)).toEqual([])
  })

  it('groups adjacent inserts and deletes into a single chunk', () => {
    const lines = makeLines(['equal', 'delete', 'insert', 'equal'])
    const chunks = findDiffChunks(lines)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toEqual({ id: 0, start: 1, end: 2 })
  })

  it('identifies separate chunks separated by equal lines', () => {
    const lines = makeLines([
      'insert',
      'equal',
      'equal',
      'delete',
      'equal',
    ])
    const chunks = findDiffChunks(lines)
    expect(chunks).toHaveLength(2)
    expect(chunks[0]).toEqual({ id: 0, start: 0, end: 0 })
    expect(chunks[1]).toEqual({ id: 1, start: 3, end: 3 })
  })
})

describe('computeCollapsibleSections', () => {
  it('does not collapse when unchanged gap is 6 lines or less', () => {
    const lines = makeLines([
      'insert',
      'equal',
      'equal',
      'equal',
      'equal',
      'equal',
      'equal',
      'delete',
    ])
    expect(computeCollapsibleSections(lines, 3)).toEqual([])
  })

  it('collapses unchanged lines beyond 3 context lines between chunks', () => {
    const types: Array<'equal' | 'insert' | 'delete'> = [
      'insert',
      ...Array.from({ length: 10 }, () => 'equal' as const),
      'delete',
    ]
    const lines = makeLines(types)
    const sections = computeCollapsibleSections(lines, 3)
    expect(sections).toHaveLength(1)
    expect(sections[0]?.start).toBe(4)
    expect(sections[0]?.end).toBe(8)
    expect(sections[0]?.count).toBe(4)
  })

  it('collapses leading unchanged lines leaving 3 context lines', () => {
    const types: Array<'equal' | 'insert' | 'delete'> = [
      ...Array.from({ length: 8 }, () => 'equal' as const),
      'insert',
    ]
    const lines = makeLines(types)
    const sections = computeCollapsibleSections(lines, 3)
    expect(sections).toHaveLength(1)
    expect(sections[0]?.start).toBe(0)
    expect(sections[0]?.end).toBe(5)
    expect(sections[0]?.count).toBe(5)
  })
})

describe('buildDiffViewItems', () => {
  it('renders collapsed placeholders when sections are not expanded', () => {
    const types: Array<'equal' | 'insert' | 'delete'> = [
      ...Array.from({ length: 10 }, () => 'equal' as const),
      'insert',
    ]
    const lines = makeLines(types)
    const items = buildDiffViewItems(lines, new Set(), 3)
    const collapsed = items.filter(it => it.kind === 'collapsed')
    expect(collapsed).toHaveLength(1)
    expect(collapsed[0]?.count).toBe(7)
  })

  it('expands section when id is in expandedSectionIds', () => {
    const types: Array<'equal' | 'insert' | 'delete'> = [
      ...Array.from({ length: 10 }, () => 'equal' as const),
      'insert',
    ]
    const lines = makeLines(types)
    const expanded = new Set<number>([0])
    const items = buildDiffViewItems(lines, expanded, 3)
    expect(items.every(it => it.kind === 'line')).toBe(true)
    expect(items).toHaveLength(11)
  })
})
