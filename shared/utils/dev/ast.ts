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
  'directive'
])

export function offsetToPosition(source: string, offset: number): SourcePosition {
  const safe = Math.max(0, Math.min(offset, source.length))
  let line = 1
  let column = 1
  for (let i = 0; i < safe; i += 1) {
    if (source[i] === '\n') {
      line += 1
      column = 1
    } else {
      column += 1
    }
  }
  return { line, column, offset: safe }
}

export function createSpan(source: string, start: number, end: number): SourceSpan {
  return {
    start: offsetToPosition(source, start),
    end: offsetToPosition(source, end)
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

export function buildAstTree(
  node: unknown,
  source: string,
  path = '0'
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
        const child = buildAstTree(item, source, `${path}.${key}.${index}`)
        if (child) {
          children.push(child)
        }
      })
      continue
    }

    const child = buildAstTree(value, source, `${path}.${key}.${childIndex}`)
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
    span: createSpan(source, start, end),
    children
  }
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
