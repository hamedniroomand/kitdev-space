import type { MailPolicyKind, MailPolicyReport } from '#shared/utils/network/email-health'
import { MAIL_POLICY_NAMES, parseMailPolicy } from '#shared/utils/network/email-health'
import { lookupDns } from './dns'

export type TxtResolver = (name: string) => Promise<string[]>

const POLICY_KINDS: MailPolicyKind[] = ['mta-sts', 'tls-rpt', 'bimi']

function dnsResolver(): TxtResolver {
  return name => lookupDns(name, 'TXT') as Promise<string[]>
}

/**
 * Reads the MTA-STS, SMTP TLS Reporting, and BIMI records of a domain.
 * The tool reads DNS only. It does not fetch the MTA-STS policy file over
 * HTTPS.
 */
export async function lookupMailPolicies(
  domain: string,
  txt: TxtResolver = dnsResolver(),
): Promise<Record<MailPolicyKind, MailPolicyReport>> {
  const reports = await Promise.all(POLICY_KINDS.map(async (kind) => {
    const name = MAIL_POLICY_NAMES[kind](domain)
    try {
      return parseMailPolicy(kind, await txt(name), { domain })
    }
    catch {
      return parseMailPolicy(kind, [], { domain, lookup: 'failed' })
    }
  }))

  return {
    'mta-sts': reports[0]!,
    'tls-rpt': reports[1]!,
    'bimi': reports[2]!,
  }
}
