import type { DkimSelectorInput } from '#shared/utils/network/email-health'
import { lookupDns } from './dns'

export interface DkimResolvers {
  txt: (name: string) => Promise<string[]>
  cname: (name: string) => Promise<string[]>
}

function dnsResolvers(): DkimResolvers {
  return {
    txt: name => lookupDns(name, 'TXT') as Promise<string[]>,
    cname: name => lookupDns(name, 'CNAME') as Promise<string[]>,
  }
}

/**
 * Reads the DKIM record of one selector.
 * Many providers put the key on their own domain and leave a CNAME on the
 * selector. The function reports the CNAME target and reads the key from it
 * when the selector name itself gives no TXT record.
 */
export async function lookupDkimSelector(
  domain: string,
  selector: string,
  resolvers: DkimResolvers = dnsResolvers(),
): Promise<DkimSelectorInput> {
  const name = `${selector}._domainkey.${domain}`

  const [records, cnames] = await Promise.all([
    resolvers.txt(name).catch(() => null),
    resolvers.cname(name).catch(() => []),
  ])

  const cname = cnames[0]?.replace(/\.$/, '').toLowerCase() ?? null

  if (records === null) {
    return { selector, records: [], lookup: 'failed', cname }
  }

  if (records.length > 0 || !cname) {
    return { selector, records, lookup: 'ok', cname }
  }

  const viaCname = await resolvers.txt(cname).catch(() => null)
  if (viaCname === null) {
    return { selector, records: [], lookup: 'failed', cname }
  }

  return { selector, records: viaCname, lookup: 'ok', cname }
}

export function lookupDkimSelectors(
  domain: string,
  selectors: string[],
  resolvers?: DkimResolvers,
): Promise<DkimSelectorInput[]> {
  return Promise.all(selectors.map(selector => lookupDkimSelector(domain, selector, resolvers)))
}
