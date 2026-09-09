import type { HttpInspectResult, HttpReport } from './http-report'
import type { SecurityFinding } from './security-headers'
import { buildHttpReport } from './http-report'

export interface FindingChange {
  key: string
  before: SecurityFinding
  after: SecurityFinding
}

export interface HttpReportDiff {
  /** Findings that are a problem now, but were not a problem before. */
  added: SecurityFinding[]
  /** Findings that were a problem before, but are not a problem now. */
  resolved: SecurityFinding[]
  /** Findings that stay, with a new level or a new value. */
  changed: FindingChange[]
  scoreDelta: number
  previousCheckedAt: string
  previousUrl: string
}

function keyOf(finding: SecurityFinding): string {
  return `${finding.id}|${finding.header}`
}

function isProblem(finding: SecurityFinding): boolean {
  return finding.level !== 'ok'
}

interface ReportLike {
  tool?: string
  result?: unknown
  security?: { findings?: unknown }
}

function asReportLike(value: unknown): ReportLike | null {
  return typeof value === 'object' && value !== null ? value as ReportLike : null
}

/**
 * Read an exported report. The parser accepts the report file and the raw
 * `{ "result": ... }` body of the API. It returns null for any other text.
 */
export function parseHttpReport(text: string): HttpReport | null {
  let data: unknown
  try {
    data = JSON.parse(text)
  }
  catch {
    return null
  }

  const root = asReportLike(data)
  if (!root) {
    return null
  }

  const candidate = asReportLike(root.result) ?? root
  if (!Array.isArray(candidate.security?.findings)) {
    return null
  }

  if (candidate.tool === 'http-inspector') {
    return candidate as unknown as HttpReport
  }

  return buildHttpReport(candidate as unknown as HttpInspectResult)
}

export function diffHttpReports(previous: HttpReport, current: HttpReport): HttpReportDiff {
  const before = new Map(previous.security.findings.map(item => [keyOf(item), item]))
  const after = new Map(current.security.findings.map(item => [keyOf(item), item]))

  const added: SecurityFinding[] = []
  const resolved: SecurityFinding[] = []
  const changed: FindingChange[] = []

  for (const key of new Set([...before.keys(), ...after.keys()])) {
    const past = before.get(key)
    const now = after.get(key)

    if (now && isProblem(now) && (!past || !isProblem(past))) {
      added.push(now)
    }
    else if (past && isProblem(past) && (!now || !isProblem(now))) {
      resolved.push(past)
    }
    else if (past && now && (past.level !== now.level || past.value !== now.value)) {
      changed.push({ key, before: past, after: now })
    }
  }

  return {
    added,
    resolved,
    changed,
    scoreDelta: current.security.score - previous.security.score,
    previousCheckedAt: previous.checkedAt,
    previousUrl: previous.finalUrl,
  }
}
