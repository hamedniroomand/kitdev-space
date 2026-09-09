export interface SourcePosition {
  line: number
  column: number
  offset: number
}

export interface SourceSpan {
  start: SourcePosition
  end: SourcePosition
}

export interface AstTreeNode {
  id: string
  type: string
  label: string | null
  start: number
  end: number
  span: SourceSpan
  children: AstTreeNode[]
}

export type AstLanguage = 'javascript' | 'jsx' | 'typescript' | 'tsx'
export type ResolveMode = 'esm' | 'node'

const SKIP_KEYS = new Set([
  'tokens',
  'comments',
  'loc',
  'range',
  'start',
  'end',
  'raw',
  'value',
  'name',
  'operator',
  'kind',
  'sourceType',
  'directive',
])

export type PositionMapper = (offset: number) => SourcePosition

/** The offset of the first character of every line. Line 1 starts at offset 0. */
export function createLineStarts(source: string): number[] {
  const starts = [0]
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === '\n') {
      starts.push(i + 1)
    }
  }
  return starts
}

/** The index of the last line that starts at or before the offset. */
function lineIndexAt(lineStarts: number[], offset: number): number {
  let low = 0
  let high = lineStarts.length - 1
  while (low < high) {
    const mid = (low + high + 1) >> 1
    if ((lineStarts[mid] ?? 0) <= offset) {
      low = mid
    }
    else {
      high = mid - 1
    }
  }
  return low
}

/**
 * Builds the line-start table one time. Each lookup is then a binary search.
 * A tree of one large file asks for two positions per node, so a scan of the
 * source for each lookup makes the tree build quadratic.
 */
export function createPositionMapper(source: string): PositionMapper {
  const lineStarts = createLineStarts(source)
  const length = source.length

  return (offset: number): SourcePosition => {
    const safe = Math.max(0, Math.min(offset, length))
    const index = lineIndexAt(lineStarts, safe)
    return {
      line: index + 1,
      column: safe - (lineStarts[index] ?? 0) + 1,
      offset: safe,
    }
  }
}

export function offsetToPosition(source: string, offset: number): SourcePosition {
  return createPositionMapper(source)(offset)
}

export function createSpan(source: string, start: number, end: number): SourceSpan {
  const at = createPositionMapper(source)
  return {
    start: at(start),
    end: at(end),
  }
}

function nodeLabel(node: Record<string, unknown>): string | null {
  if (typeof node.name === 'string') {
    return node.name
  }
  if (typeof node.value === 'string' || typeof node.value === 'number' || typeof node.value === 'boolean') {
    return String(node.value)
  }
  if (typeof node.operator === 'string') {
    return node.operator
  }
  if (typeof node.kind === 'string') {
    return node.kind
  }
  if (node.source && typeof node.source === 'object' && node.source !== null) {
    const source = node.source as Record<string, unknown>
    if (typeof source.value === 'string') {
      return source.value
    }
  }
  return null
}

function isAstNode(value: unknown): value is Record<string, unknown> & { type: string } {
  return Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && typeof (value as { type?: unknown }).type === 'string'
}

function buildNode(
  node: unknown,
  at: PositionMapper,
  path: string,
): AstTreeNode | null {
  if (!isAstNode(node)) {
    return null
  }

  const start = typeof node.start === 'number' ? node.start : 0
  const end = typeof node.end === 'number' ? node.end : start
  const children: AstTreeNode[] = []
  let childIndex = 0

  for (const [key, value] of Object.entries(node)) {
    if (SKIP_KEYS.has(key)) {
      continue
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        const child = buildNode(item, at, `${path}.${key}.${index}`)
        if (child) {
          children.push(child)
        }
      })
      continue
    }

    const child = buildNode(value, at, `${path}.${key}.${childIndex}`)
    if (child) {
      children.push(child)
      childIndex += 1
    }
  }

  return {
    id: path,
    type: node.type,
    label: nodeLabel(node),
    start,
    end,
    span: { start: at(start), end: at(end) },
    children,
  }
}

export function buildAstTree(
  node: unknown,
  source: string,
  path = '0',
): AstTreeNode | null {
  return buildNode(node, createPositionMapper(source), path)
}

/** The nodes that contain the offset, from the root to the deepest node. */
export function findAstPathAtOffset(tree: AstTreeNode | null, offset: number): AstTreeNode[] {
  const path: AstTreeNode[] = []
  let current = tree

  while (current) {
    path.push(current)
    current = current.children.find(child => child.start <= offset && offset <= child.end) ?? null
  }

  return path
}

export function findAstNodeAtOffset(tree: AstTreeNode | null, offset: number): AstTreeNode | null {
  const path = findAstPathAtOffset(tree, offset)
  return path[path.length - 1] ?? null
}

export interface AstTypeSearch {
  /** The ids of the nodes with a matched type name. */
  matches: Set<string>
  /** The ids of the parents of a match, to open the branch. */
  expand: Set<string>
}

export function searchAstTypes(tree: AstTreeNode | null, query: string): AstTypeSearch {
  const matches = new Set<string>()
  const expand = new Set<string>()
  const needle = query.trim().toLowerCase()

  if (!tree || !needle) {
    return { matches, expand }
  }

  const ancestors: string[] = []

  function walk(node: AstTreeNode): void {
    if (node.type.toLowerCase().includes(needle)) {
      matches.add(node.id)
      for (const id of ancestors) {
        expand.add(id)
      }
    }

    ancestors.push(node.id)
    for (const child of node.children) {
      walk(child)
    }
    ancestors.pop()
  }

  walk(tree)
  return { matches, expand }
}

export function sliceSource(source: string, start: number, end: number): string {
  return source.slice(Math.max(0, start), Math.max(start, end))
}

export function languageToFilename(language: AstLanguage): string {
  switch (language) {
    case 'javascript':
      return 'input.js'
    case 'jsx':
      return 'input.jsx'
    case 'typescript':
      return 'input.ts'
    case 'tsx':
      return 'input.tsx'
  }
}

export function collectImportSpecifiers(program: unknown): string[] {
  const found = new Set<string>()

  function walk(node: unknown): void {
    if (!node || typeof node !== 'object') {
      return
    }

    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }

    const value = node as Record<string, unknown>
    if (typeof value.type === 'string') {
      if (
        (value.type === 'ImportDeclaration'
          || value.type === 'ExportNamedDeclaration'
          || value.type === 'ExportAllDeclaration')
        && value.source
        && typeof value.source === 'object'
        && value.source !== null
        && typeof (value.source as { value?: unknown }).value === 'string'
      ) {
        found.add(String((value.source as { value: string }).value))
      }

      if (
        value.type === 'CallExpression'
        && value.callee
        && typeof value.callee === 'object'
        && value.callee !== null
        && (value.callee as { type?: string, name?: string }).type === 'Identifier'
        && (value.callee as { name?: string }).name === 'require'
        && Array.isArray(value.arguments)
        && value.arguments[0]
        && typeof value.arguments[0] === 'object'
        && (value.arguments[0] as { type?: string, value?: unknown }).type === 'Literal'
        && typeof (value.arguments[0] as { value?: unknown }).value === 'string'
      ) {
        found.add(String((value.arguments[0] as { value: string }).value))
      }

      if (
        value.type === 'ImportExpression'
        && value.source
        && typeof value.source === 'object'
        && (value.source as { type?: string, value?: unknown }).type === 'Literal'
        && typeof (value.source as { value?: unknown }).value === 'string'
      ) {
        found.add(String((value.source as { value: string }).value))
      }
    }

    for (const child of Object.values(value)) {
      walk(child)
    }
  }

  walk(program)
  return [...found]
}
