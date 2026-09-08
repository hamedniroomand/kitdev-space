import type { DiffLine } from './diff'

export interface DiffChunk {
  id: number
  start: number
  end: number
}

export interface CollapsibleSection {
  id: number
  start: number
  end: number
  count: number
}

export type DiffViewItem
  = { chunkId?: number, kind: 'line', line: DiffLine, originalIndex: number }
    | { count: number, end: number, id: number, kind: 'collapsed', start: number }

export function findDiffChunks(lines: DiffLine[]): DiffChunk[] {
  const chunks: DiffChunk[] = []
  let inChunk = false
  let start = 0
  let id = 0

  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.type !== 'equal') {
      if (!inChunk) {
        inChunk = true
        start = i
      }
    }
    else {
      if (inChunk) {
        inChunk = false
        chunks.push({ id: id++, start, end: i - 1 })
      }
    }
  }

  if (inChunk) {
    chunks.push({ id: id++, start, end: lines.length - 1 })
  }

  return chunks
}

export function computeCollapsibleSections(
  lines: DiffLine[],
  context = 3,
): CollapsibleSection[] {
  const n = lines.length
  if (n === 0) {
    return []
  }

  const isChanged = lines.map(line => line.type !== 'equal')
  const hasChanges = isChanged.some(Boolean)

  if (!hasChanges) {
    if (n <= context * 2) {
      return []
    }
    return [{ id: 0, start: context, end: n - context, count: n - context * 2 }]
  }

  const dist = new Int32Array(n).fill(999_999)
  let lastChanged = -999_999

  for (let i = 0; i < n; i++) {
    if (isChanged[i]) {
      lastChanged = i
    }
    dist[i] = i - lastChanged
  }

  lastChanged = 999_999
  for (let i = n - 1; i >= 0; i--) {
    if (isChanged[i]) {
      lastChanged = i
    }
    dist[i] = Math.min(dist[i]!, lastChanged - i)
  }

  const sections: CollapsibleSection[] = []
  let inCollapsed = false
  let start = 0
  let id = 0

  for (let i = 0; i < n; i++) {
    if (dist[i]! > context) {
      if (!inCollapsed) {
        inCollapsed = true
        start = i
      }
    }
    else {
      if (inCollapsed) {
        inCollapsed = false
        sections.push({ id: id++, start, end: i, count: i - start })
      }
    }
  }

  if (inCollapsed) {
    sections.push({ id: id++, start, end: n, count: n - start })
  }

  return sections
}

export function buildDiffViewItems(
  lines: DiffLine[],
  expandedSectionIds: Set<number>,
  context = 3,
): DiffViewItem[] {
  const chunks = findDiffChunks(lines)
  const lineChunkMap = new Map<number, number>()

  for (const chunk of chunks) {
    for (let i = chunk.start; i <= chunk.end; i++) {
      lineChunkMap.set(i, chunk.id)
    }
  }

  const sections = computeCollapsibleSections(lines, context)
  const collapsedMap = new Map<number, CollapsibleSection>()

  for (const section of sections) {
    if (!expandedSectionIds.has(section.id)) {
      collapsedMap.set(section.start, section)
    }
  }

  const items: DiffViewItem[] = []
  let i = 0

  while (i < lines.length) {
    const collapsed = collapsedMap.get(i)
    if (collapsed) {
      items.push({
        kind: 'collapsed',
        id: collapsed.id,
        count: collapsed.count,
        start: collapsed.start,
        end: collapsed.end,
      })
      i = collapsed.end
      continue
    }

    items.push({
      kind: 'line',
      line: lines[i]!,
      originalIndex: i,
      chunkId: lineChunkMap.get(i),
    })
    i++
  }

  return items
}
