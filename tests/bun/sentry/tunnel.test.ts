import { describe, expect, it } from 'bun:test'
import { MAX_ENVELOPE_BYTES, resolveEnvelopeTarget } from '#server/utils/sentry/tunnel'

const DSN = 'https://abc123@o1.ingest.de.sentry.io/42'
const encode = (text: string) => new TextEncoder().encode(text)

describe('resolveEnvelopeTarget', () => {
  it('forwards an envelope for this project to its ingest URL', () => {
    const body = encode(`${JSON.stringify({ dsn: DSN, sent_at: 'now' })}\n{"type":"event"}\n{}`)
    expect(resolveEnvelopeTarget(body, DSN)).toEqual({ url: 'https://o1.ingest.de.sentry.io/api/42/envelope/' })
  })

  it('rejects an envelope for another project, host, or key', () => {
    for (const other of ['https://abc123@o1.ingest.de.sentry.io/43', 'https://abc123@o2.ingest.us.sentry.io/42', 'https://zzz@o1.ingest.de.sentry.io/42']) {
      expect(resolveEnvelopeTarget(encode(`${JSON.stringify({ dsn: other })}\n`), DSN)).toBeNull()
    }
  })

  it('rejects a bad header, a missing dsn, an empty body, and an oversized body', () => {
    expect(resolveEnvelopeTarget(encode('not json\n'), DSN)).toBeNull()
    expect(resolveEnvelopeTarget(encode('{"sent_at":"now"}\n'), DSN)).toBeNull()
    expect(resolveEnvelopeTarget(new Uint8Array(), DSN)).toBeNull()
    expect(resolveEnvelopeTarget(new Uint8Array(MAX_ENVELOPE_BYTES + 1), DSN)).toBeNull()
  })
})
