import type { DiffLine, DiffOp } from './diff'

export interface DiffSpan {
  type: DiffOp
  text: string
}

export function tokenizeWords(text: string): string[] {
  const tokens: string[] = []
  const re = /\w+|\s+|[^\w\s]+/g
  let match: RegExpExecArray | null = re.exec(text)

  while (match !== null) {
    tokens.push(match[0])
    match = re.exec(text)
  }

  return tokens
}

export function mergeSpans(parts: Array<{ type: DiffOp, text: string }>): DiffSpan[] {
  const spans: DiffSpan[] = []

  for (const part of parts) {
    const last = spans[spans.length - 1]
    if (last && last.type === part.type) {
      last.text += part.text
    }
    else {
      spans.push({ type: part.type, text: part.text })
    }
  }

  return spans
}

export function diffTokens(
  aTokens: string[],
  bTokens: string[],
): Array<{ type: DiffOp, text: string }> {
  const n = aTokens.length
  const m = bTokens.length

  if (n === 0) {
    return bTokens.map(text => ({ type: 'insert' as const, text }))
  }
  if (m === 0) {
    return aTokens.map(text => ({ type: 'delete' as const, text }))
  }

  const max = n + m
  const offset = max
  const v = new Int32Array(2 * max + 1).fill(-1)
  v[offset + 1] = 0
  const trace: Int32Array[] = []

  for (let d = 0; d <= max; d++) {
    trace.push(new Int32Array(v))

    for (let k = -d; k <= d; k += 2) {
      let x = (k === -d || (k !== d && v[offset + k - 1]! < v[offset + k + 1]!))
        ? v[offset + k + 1]!
        : v[offset + k - 1]! + 1
      let y = x - k

      while (x < n && y < m && aTokens[x] === bTokens[y]) {
        x++
        y++
      }

      v[offset + k] = x

      if (x >= n && y >= m) {
        const parts: Array<{ type: DiffOp, text: string }> = []
        for (let step = d; step >= 0; step--) {
          const vSnap = trace[step]!
          const prevK = (k === -step || (k !== step && vSnap[offset + k - 1]! < vSnap[offset + k + 1]!))
            ? k + 1
            : k - 1
          const prevX = vSnap[offset + prevK]!
          const prevY = prevX - prevK

          while (x > prevX && y > prevY) {
            parts.push({ type: 'equal', text: aTokens[x - 1]! })
            x--
            y--
          }

          if (step === 0) {
            break
          }

          if (x === prevX) {
            parts.push({ type: 'insert', text: bTokens[prevY]! })
          }
          else {
            parts.push({ type: 'delete', text: aTokens[prevX]! })
          }

          x = prevX
          y = prevY
          k = prevK
        }
        parts.reverse()
        return parts
      }
    }
  }

  return [
    ...aTokens.map(text => ({ type: 'delete' as const, text })),
    ...bTokens.map(text => ({ type: 'insert' as const, text })),
  ]
}

export function diffLineWords(
  oldText: string,
  newText: string,
): { oldSpans: DiffSpan[], newSpans: DiffSpan[] } {
  const aTokens = tokenizeWords(oldText)
  const bTokens = tokenizeWords(newText)
  const parts = diffTokens(aTokens, bTokens)

  const oldParts = parts.filter(part => part.type !== 'insert')
  const newParts = parts.filter(part => part.type !== 'delete')

  return {
    oldSpans: mergeSpans(oldParts),
    newSpans: mergeSpans(newParts),
  }
}

export function applyWordDiff(lines: DiffLine[]): DiffLine[] {
  if (lines.length > 5_000) {
    return lines
  }

  let i = 0

  while (i < lines.length) {
    if (lines[i]!.type !== 'delete') {
      i++
      continue
    }

    const deleteStart = i
    while (i < lines.length && lines[i]!.type === 'delete') {
      i++
    }
    const deleteEnd = i

    const insertStart = i
    while (i < lines.length && lines[i]!.type === 'insert') {
      i++
    }
    const insertEnd = i

    const deleteCount = deleteEnd - deleteStart
    const insertCount = insertEnd - insertStart
    const pairCount = Math.min(deleteCount, insertCount)

    for (let k = 0; k < pairCount; k++) {
      const delLine = lines[deleteStart + k]!
      const insLine = lines[insertStart + k]!
      const { oldSpans, newSpans } = diffLineWords(delLine.text, insLine.text)
      delLine.spans = oldSpans
      insLine.spans = newSpans
    }
  }

  return lines
}
