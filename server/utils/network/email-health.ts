import type { EmailHealthResult, LookupStatus, MxRecordInput } from '#shared/utils/network/email-health'
import {
  buildEmailHealthResult,
  normalizeDkimSelectors,
  scoreEmailHealth,
} from '#shared/utils/network/email-health'
import { lookupDkimSelectors } from './dkim'
import { lookupDns, normalizeDomain } from './dns'
import { lookupMailPolicies } from './mail-policy'
import { traceSpf } from './spf'

export interface LookupOutcome<T> {
  status: LookupStatus
  records: T
}

/**
 * Runs one DNS query and keeps the outcome.
 * `lookupDns` gives an empty array for an absent record and throws for a
 * resolver error. The two cases must stay separate in the report.
 */
export async function runLookup<T>(query: () => Promise<T>, empty: T): Promise<LookupOutcome<T>> {
  try {
    return { status: 'ok', records: await query() }
  }
  catch {
    return { status: 'failed', records: empty }
  }
}

export async function inspectEmailHealth(
  domain: string,
  dkimSelectors?: string[] | string,
): Promise<EmailHealthResult> {
  const host = normalizeDomain(domain)
  const selectors = normalizeDkimSelectors(dkimSelectors)

  const [txt, mx, dmarc] = await Promise.all([
    runLookup(() => lookupDns(host, 'TXT') as Promise<string[]>, []),
    runLookup(() => lookupDns(host, 'MX') as Promise<MxRecordInput[]>, []),
    // A failed _dmarc query must not stop the rest of the report.
    runLookup(() => lookupDns(`_dmarc.${host}`, 'TXT') as Promise<string[]>, []),
  ])

  const [dkim, policies] = await Promise.all([
    lookupDkimSelectors(host, selectors),
    lookupMailPolicies(host),
  ])

  const result = buildEmailHealthResult({
    domain: host,
    txtRecords: txt.records,
    dmarcRecords: dmarc.records,
    mxRecords: mx.records,
    dkim,
    lookups: { txt: txt.status, mx: mx.status, dmarc: dmarc.status },
  })

  // The trace keeps its own issues. The page shows them in the trace block.
  if (result.spf.present) {
    result.spf.trace = await traceSpf(host, { rootRecords: txt.records })
  }

  result.mtaSts = policies['mta-sts']
  result.tlsRpt = policies['tls-rpt']
  result.bimi = policies.bimi
  result.score = scoreEmailHealth(result)

  return result
}
