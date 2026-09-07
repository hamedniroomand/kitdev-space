import type { EmailHealthResult } from '#shared/utils/network/email-health'
import {
  buildEmailHealthResult,

  normalizeDkimSelectors,
} from '#shared/utils/network/email-health'
import { lookupDns, normalizeDomain } from './dns'

interface MxRecord { priority: number, exchange: string }

export async function inspectEmailHealth(
  domain: string,
  dkimSelectors?: string[] | string,
): Promise<EmailHealthResult> {
  const host = normalizeDomain(domain)
  const selectors = normalizeDkimSelectors(dkimSelectors)

  const [txtRecords, mxRecords, dmarcRecords] = await Promise.all([
    (lookupDns(host, 'TXT') as Promise<string[]>).catch(() => []),
    (lookupDns(host, 'MX') as Promise<MxRecord[]>).catch(() => []),
    // A failed _dmarc lookup must not stop the rest of the report.
    (lookupDns(`_dmarc.${host}`, 'TXT') as Promise<string[]>).catch(() => []),
  ])

  const dkim = await Promise.all(selectors.map(async (selector) => {
    const records = await (lookupDns(`${selector}._domainkey.${host}`, 'TXT') as Promise<string[]>).catch(() => [])
    return { selector, records }
  }))

  return buildEmailHealthResult({
    domain: host,
    txtRecords,
    dmarcRecords,
    mxRecords,
    dkim,
  })
}
