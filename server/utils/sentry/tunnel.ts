/** Sentry rejects a larger envelope anyway, and the cap keeps the relay cheap. */
export const MAX_ENVELOPE_BYTES = 1_000_000

export interface EnvelopeTarget {
  /** The ingest URL for the project of the DSN. */
  url: string
}

/**
 * Reads the envelope header, the first line of the body, and checks that its
 * DSN is the DSN of this site. The route then forwards only envelopes for this
 * project, so it cannot be used as a relay to another Sentry project.
 * Returns null when the envelope is not acceptable.
 */
export function resolveEnvelopeTarget(bytes: Uint8Array, dsn: string): EnvelopeTarget | null {
  if (!bytes.byteLength || bytes.byteLength > MAX_ENVELOPE_BYTES) {
    return null
  }

  const newline = bytes.indexOf(10)
  const headerText = new TextDecoder().decode(bytes.subarray(0, newline < 0 ? bytes.byteLength : newline))

  let header: { dsn?: unknown }
  try {
    header = JSON.parse(headerText)
  }
  catch {
    return null
  }
  if (!header || typeof header.dsn !== 'string') {
    return null
  }

  let ours: URL
  let theirs: URL
  try {
    ours = new URL(dsn)
    theirs = new URL(header.dsn)
  }
  catch {
    return null
  }

  // Same host, same project id, same public key.
  if (theirs.host !== ours.host || theirs.pathname !== ours.pathname || theirs.username !== ours.username) {
    return null
  }

  const projectId = ours.pathname.replace(/^\/+/, '')
  return { url: `https://${ours.host}/api/${projectId}/envelope/` }
}
