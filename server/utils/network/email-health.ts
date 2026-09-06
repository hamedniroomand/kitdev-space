import {
  buildEmailHealthResult,
  normalizeDkimSelectors,
  type EmailHealthResult
} from '#shared/utils/network/email-health'
import { lookupDns, normalizeDomain } from './dns'

type MxRecord = { priority: number, exchange: string }

export async function inspectEmailHealth(
  domain: string,
  dkimSelectors?: string[] | string
): Promise<EmailHealthResult> {
  const host = normalizeDomain(domain)
  const selectors = normalizeDkimSelectors(dkimSelectors)

  const [txtRecords, mxRecords] = await Promise.all([
    lookupDns(host, 'TXT') as Promise<string[]>,
    lookupDns(host, 'MX') as Promise<MxRecord[]>
  ])

  const dkim = await Promise.all(selectors.map(async (selector) => {
    const records = await lookupDns(`${selector}._domainkey.${host}`, 'TXT') as string[]
    return { selector, records }
  }))

  return buildEmailHealthResult({
    domain: host,
    txtRecords,
    mxRecords,
    dkim
  })
}
