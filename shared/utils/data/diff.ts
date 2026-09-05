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
}

/**
 * Compare two texts by line with Myers O(ND) diff.
 * Strips a shared prefix and suffix first so long similar texts stay fast.
 * Helpers stay nested so this function can run in a web worker.
 */
export function diffTexts(left: string, right: string): DiffResult {
  type Part = { type: DiffOp, text: string }

  function splitLines(text: string): string[] {
    if (text.length === 0) {
      return []
    }
    return text.split('\n')
  }

  function backtrack(
    a: string[],
    b: string[],
    trace: Int32Array[],
    offset: number
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
      } else {
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
      } else {
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
        } else {
          x = v[offset + k - 1]! + 1
        }

        let y = x - k
        while (x < n && y < m && a[x] === b[y]) {
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
      ...b.map(text => ({ type: 'insert' as const, text }))
    ]
  }

  function diffArrays(a: string[], b: string[]): DiffResult {
    let start = 0
    const aLen = a.length
    const bLen = b.length
    const minLen = Math.min(aLen, bLen)

    while (start < minLen && a[start] === b[start]) {
      start++
    }

    let endA = aLen
    let endB = bLen
    while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
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
        newLine: newLine++
      })
      unchanged++
    }

    for (const part of middle) {
      if (part.type === 'equal') {
        lines.push({
          type: 'equal',
          text: part.text,
          oldLine: oldLine++,
          newLine: newLine++
        })
        unchanged++
      } else if (part.type === 'delete') {
        lines.push({
          type: 'delete',
          text: part.text,
          oldLine: oldLine++,
          newLine: null
        })
        removed++
      } else {
        lines.push({
          type: 'insert',
          text: part.text,
          oldLine: null,
          newLine: newLine++
        })
        added++
      }
    }

    for (let i = endA; i < aLen; i++) {
      lines.push({
        type: 'equal',
        text: a[i]!,
        oldLine: oldLine++,
        newLine: newLine++
      })
      unchanged++
    }

    return { lines, added, removed, unchanged }
  }

  if (left === right) {
    if (left.length === 0) {
      return { lines: [], added: 0, removed: 0, unchanged: 0 }
    }

    const parts = splitLines(left)
    return {
      lines: parts.map((text, index) => ({
        type: 'equal' as const,
        text,
        oldLine: index + 1,
        newLine: index + 1
      })),
      added: 0,
      removed: 0,
      unchanged: parts.length
    }
  }

  return diffArrays(splitLines(left), splitLines(right))
}

export function formatUnifiedDiff(
  result: DiffResult,
  oldName = 'a',
  newName = 'b'
): string {
  if (result.added === 0 && result.removed === 0) {
    return ''
  }

  const CONTEXT = 3
  const out: string[] = [`--- ${oldName}`, `+++ ${newName}`]
  const lines = result.lines
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
      } else {
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
      } else if (line.type === 'delete') {
        if (oldStart === 0 && line.oldLine !== null) {
          oldStart = line.oldLine
        }
        oldCount++
        body.push(`-${line.text}`)
      } else {
        if (newStart === 0 && line.newLine !== null) {
          newStart = line.newLine
        }
        newCount++
        body.push(`+${line.text}`)
      }
    }

    if (oldStart === 0) {
      oldStart = 1
    }
    if (newStart === 0) {
      newStart = 1
    }

    out.push(`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`)
    out.push(...body)
    i = end
  }

  return out.join('\n')
}
