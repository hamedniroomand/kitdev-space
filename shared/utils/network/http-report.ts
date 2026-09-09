import type { SecurityHeaderReport } from './security-headers'

export type HttpRequestMethod = 'HEAD' | 'GET' | 'OPTIONS'

export interface RedirectHop {
  url: string
  status: number
  statusText?: string
  location?: string
  /** The response headers of this hop. */
  headers?: Record<string, string>
  /** The time from the request to the response headers, in milliseconds. */
  durationMs?: number
  /** True when this hop points back to a URL that is already in the chain. */
  loop?: boolean
}

/** The body that `/api/network/headers` returns. */
export interface HttpInspectResult {
  status: number
  statusText: string
  headers: Record<string, string>
  url: string
  hops: RedirectHop[]
  security: SecurityHeaderReport
  checkedAt?: string
  requestedUrl?: string
  requestOrigin?: string | null
  method?: HttpRequestMethod
}

/** The JSON file that the user downloads, and that the diff view reads. */
export interface HttpReport {
  tool: 'http-inspector'
  /** ISO 8601 time of the check. */
  checkedAt: string
  requestedUrl: string
  finalUrl: string
  method: HttpRequestMethod
  requestOrigin: string | null
  status: number
  statusText: string
  /** The raw response header map of the final URL. */
  headers: Record<string, string>
  hops: RedirectHop[]
  security: SecurityHeaderReport
}

const REDIRECT_NOTES: Record<number, string> = {
  301: 'Permanent. A client replaces the old URL. A browser can change the method to GET.',
  302: 'Temporary. The old URL stays. A browser can change the method to GET.',
  303: 'Temporary. The browser sends GET to the new URL.',
  307: 'Temporary. The browser keeps the method and the body.',
  308: 'Permanent. A client replaces the old URL and keeps the method and the body.',
}

/** The meaning of one redirect status. It returns null for other statuses. */
export function describeRedirect(status: number): string | null {
  return REDIRECT_NOTES[status] ?? null
}

export function buildHttpReport(result: HttpInspectResult): HttpReport {
  return {
    tool: 'http-inspector',
    checkedAt: result.checkedAt ?? new Date().toISOString(),
    requestedUrl: result.requestedUrl ?? result.url,
    finalUrl: result.url,
    method: result.method ?? 'HEAD',
    requestOrigin: result.requestOrigin ?? null,
    status: result.status,
    statusText: result.statusText,
    headers: result.headers,
    hops: result.hops,
    security: result.security,
  }
}
