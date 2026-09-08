export type DiffOp = 'equal' | 'insert' | 'delete'

export interface DiffLine {
  type: DiffOp
  text: string
  oldLine: number | null
  newLine: number | null
}

export interface DiffResult {
  lines: DiffLine[]
  added: number
  removed: number
  unchanged: number
  hasOldNewline?: boolean
  hasNewNewline?: boolean
}

export interface DiffOptions {
  ignoreWhitespace?: boolean
  ignoreTrailingWhitespace?: boolean
  ignoreCase?: boolean
  ignoreBlankLines?: boolean
  ignoreLineEndings?: boolean
}

/**
 * Compare two texts by line with Myers O(ND) diff.
 * Strips a shared prefix and suffix first so long similar texts stay fast.
 * Helpers stay nested so this function can run in a web worker.
 */
export function diffTexts(
  left: string,
  right: string,
  options: DiffOptions = {},
): DiffResult {
  interface Part { type: DiffOp, text: string }

  function normalizeLine(line: string): string {
    let result = line
    if (options.ignoreWhitespace) {
      result = result.replace(/\s+/g, '')
    }
    else if (options.ignoreTrailingWhitespace) {
      result = result.replace(/\s+$/, '')
    }
    if (options.ignoreCase) {
      result = result.toLowerCase()
    }
    return result
  }

  function areLinesEqual(a: string, b: string): boolean {
    if (a === b) {
      return true
    }
    return normalizeLine(a) === normalizeLine(b)
  }

  function splitLines(text: string): { lines: string[], hasNewline: boolean } {
    if (text.length === 0) {
      return { lines: [], hasNewline: false }
    }
    const normalized = (options.ignoreLineEndings ?? true)
      ? text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      : text
    const hasNewline = normalized.endsWith('\n')
    const content = hasNewline ? normalized.slice(0, -1) : normalized
    let lines = content.split('\n')
    if (options.ignoreBlankLines) {
      lines = lines.filter(line => line.trim().length > 0)
    }
    return { lines, hasNewline }
  }

  function backtrack(
    a: string[],
    b: string[],
    trace: Int32Array[],
    offset: number,
  ): Part[] {
    const parts: Part[] = []
    let x = a.length
    let y = b.length

    for (let d = trace.length - 1; d >= 0; d--) {
      const v = trace[d]!
      const k = x - y

      let prevK: number
      if (k === -d || (k !== d && v[offset + k - 1]! < v[offset + k + 1]!)) {
        prevK = k + 1
      }
      else {
        prevK = k - 1
      }

      const prevX = v[offset + prevK]!
      const prevY = prevX - prevK

      while (x > prevX && y > prevY) {
        parts.push({ type: 'equal', text: a[x - 1]! })
        x--
        y--
      }

      if (d === 0) {
        break
      }

      if (x === prevX) {
        parts.push({ type: 'insert', text: b[prevY]! })
      }
      else {
        parts.push({ type: 'delete', text: a[prevX]! })
      }

      x = prevX
      y = prevY
    }

    parts.reverse()
    return parts
  }

  function myers(a: string[], b: string[]): Part[] {
    const n = a.length
    const m = b.length

    if (n === 0) {
      return b.map(text => ({ type: 'insert' as const, text }))
    }
    if (m === 0) {
      return a.map(text => ({ type: 'delete' as const, text }))
    }

    const max = n + m
    const offset = max
    // ponytail: full Myers trace is O((N+M)*D) memory; if divergent multi-10k-line diffs get heavy, switch to Hirschberg or chunked diff.
    const v = new Int32Array(2 * max + 1)
    v.fill(-1)
    v[offset + 1] = 0

    const trace: Int32Array[] = []

    for (let d = 0; d <= max; d++) {
      const snapshot = new Int32Array(v)
      trace.push(snapshot)

      for (let k = -d; k <= d; k += 2) {
        let x: number

        if (k === -d || (k !== d && v[offset + k - 1]! < v[offset + k + 1]!)) {
          x = v[offset + k + 1]!
        }
        else {
          x = v[offset + k - 1]! + 1
        }

        let y = x - k
        while (x < n && y < m && areLinesEqual(a[x]!, b[y]!)) {
          x++
          y++
        }

        v[offset + k] = x

        if (x >= n && y >= m) {
          return backtrack(a, b, trace, offset)
        }
      }
    }

    return [
      ...a.map(text => ({ type: 'delete' as const, text })),
      ...b.map(text => ({ type: 'insert' as const, text })),
    ]
  }

  function diffArrays(a: string[], b: string[]): DiffResult {
    let start = 0
    const aLen = a.length
    const bLen = b.length
    const minLen = Math.min(aLen, bLen)

    while (start < minLen && areLinesEqual(a[start]!, b[start]!)) {
      start++
    }

    let endA = aLen
    let endB = bLen
    while (endA > start && endB > start && areLinesEqual(a[endA - 1]!, b[endB - 1]!)) {
      endA--
      endB--
    }

    const middle = myers(a.slice(start, endA), b.slice(start, endB))
    const lines: DiffLine[] = []
    let oldLine = 1
    let newLine = 1
    let added = 0
    let removed = 0
    let unchanged = 0

    for (let i = 0; i < start; i++) {
      lines.push({
        type: 'equal',
        text: a[i]!,
        oldLine: oldLine++,
        newLine: newLine++,
      })
      unchanged++
    }

    for (const part of middle) {
      if (part.type === 'equal') {
        lines.push({
          type: 'equal',
          text: part.text,
          oldLine: oldLine++,
          newLine: newLine++,
        })
        unchanged++
      }
      else if (part.type === 'delete') {
        lines.push({
          type: 'delete',
          text: part.text,
          oldLine: oldLine++,
          newLine: null,
        })
        removed++
      }
      else {
        lines.push({
          type: 'insert',
          text: part.text,
          oldLine: null,
          newLine: newLine++,
        })
        added++
      }
    }

    for (let i = endA; i < aLen; i++) {
      lines.push({
        type: 'equal',
        text: a[i]!,
        oldLine: oldLine++,
        newLine: newLine++,
      })
      unchanged++
    }

    return { lines, added, removed, unchanged }
  }

  if (left === right) {
    if (left.length === 0) {
      return { lines: [], added: 0, removed: 0, unchanged: 0 }
    }

    const { lines: parts, hasNewline } = splitLines(left)
    return {
      lines: parts.map((text, index) => ({
        type: 'equal' as const,
        text,
        oldLine: index + 1,
        newLine: index + 1,
      })),
      added: 0,
      removed: 0,
      unchanged: parts.length,
      hasOldNewline: hasNewline,
      hasNewNewline: hasNewline,
    }
  }

  const { lines: aLines, hasNewline: aNewline } = splitLines(left)
  const { lines: bLines, hasNewline: bNewline } = splitLines(right)
  const diff = diffArrays(aLines, bLines)
  return {
    ...diff,
    hasOldNewline: aNewline,
    hasNewNewline: bNewline,
  }
}

export function formatUnifiedDiff(
  result: DiffResult,
  oldName = 'a',
  newName = 'b',
): string {
  if (result.added === 0 && result.removed === 0) {
    return ''
  }

  const CONTEXT = 3
  const out: string[] = [`--- ${oldName}`, `+++ ${newName}`]
  const lines = result.lines
  const totalOld = lines.filter(l => l.oldLine !== null).length
  const totalNew = lines.filter(l => l.newLine !== null).length
  let i = 0

  while (i < lines.length) {
    while (i < lines.length && lines[i]!.type === 'equal') {
      i++
    }
    if (i >= lines.length) {
      break
    }

    const changeStart = i
    let changeEnd = i
    let trailingEqual = 0

    while (changeEnd < lines.length) {
      if (lines[changeEnd]!.type === 'equal') {
        trailingEqual++
        if (trailingEqual > CONTEXT * 2) {
          changeEnd -= trailingEqual - CONTEXT
          break
        }
      }
      else {
        trailingEqual = 0
      }
      changeEnd++
    }

    const start = Math.max(0, changeStart - CONTEXT)
    const end = Math.min(lines.length, changeEnd)

    let oldStart = 0
    let newStart = 0
    let oldCount = 0
    let newCount = 0
    const body: string[] = []

    for (let k = start; k < end; k++) {
      const line = lines[k]!
      if (line.type === 'equal') {
        if (oldStart === 0 && line.oldLine !== null) {
          oldStart = line.oldLine
        }
        if (newStart === 0 && line.newLine !== null) {
          newStart = line.newLine
        }
        oldCount++
        newCount++
        body.push(` ${line.text}`)
        if (
          line.oldLine === totalOld
          && line.newLine === totalNew
          && (result.hasOldNewline === false || result.hasNewNewline === false)
        ) {
          body.push('\\ No newline at end of file')
        }
      }
      else if (line.type === 'delete') {
        if (oldStart === 0 && line.oldLine !== null) {
          oldStart = line.oldLine
        }
        oldCount++
        body.push(`-${line.text}`)
        if (line.oldLine === totalOld && result.hasOldNewline === false) {
          body.push('\\ No newline at end of file')
        }
      }
      else {
        if (newStart === 0 && line.newLine !== null) {
          newStart = line.newLine
        }
        newCount++
        body.push(`+${line.text}`)
        if (line.newLine === totalNew && result.hasNewNewline === false) {
          body.push('\\ No newline at end of file')
        }
      }
    }

    if (oldCount === 0) {
      oldStart = 0
    }
    else if (oldStart === 0) {
      oldStart = 1
    }

    if (newCount === 0) {
      newStart = 0
    }
    else if (newStart === 0) {
      newStart = 1
    }

    out.push(`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`)
    out.push(...body)
    i = end
  }

  return `${out.join('\n')}\n`
}
