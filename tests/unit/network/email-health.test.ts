import { describe, expect, it } from 'vitest'
import {
  analyzeDkim,
  analyzeMx,
  buildEmailHealthResult,
  normalizeDkimSelectors,
  parseDkimRecord,
  parseDmarc,
  parseMailPolicy,
  parseSpf,
  rsaKeyBits,
  scoreEmailHealth,
} from '#shared/utils/network/email-health'

const RSA_2048 = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAs6SYk02dui0eek2ioZg/2Pt3WWzHnAPpEUsh7B+KpdHf4pMxc5kEby3CRj0TjepGs4q1cAbi+ZYuiUBH1OeQ3sy8JHCEIdfy8C1N5Gm2dgS4mgSwGqrL1f70VMbFENDXLJ7+s5ZZNtrctU3Hv42zfUnJh/AXHQCFfm9fGjuwEe3fHqL1anyxDAzq9qnoStjyza6UwZlv1ra7vaDEOZhHlw/MQYQFTDMI0yEx1pCE0Y+9yQNco4DkgQDGrkMOYijwCR1yEsYTgPyyMA0PJn/AbZUgvYwLFmHRJf4ZL8ucY8IOUd6ZzES8BrCjlbU+4aM2HbXlzaJevRfBDml3C2BmIQIDAQAB'
const RSA_1024 = 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDNF6tBbizN499stdKtxgYYpk+fmCQfTXRIgZodj4PS7Jd5liKNoQr2K3bEfouj2WjpgSgLS+NVJTa17hD2/ivcUjrxjrg+OvFWxH45JwePRNaSbn7hdZLvTJL2CvB8yy3v36F4Df1+V7XEECDT/bj/Ef8+b6/CzuOOLJkF1E4+OwIDAQAB'

describe('parseSpf', () => {
  it('reports a missing SPF record', () => {
    const report = parseSpf(['v=DMARC1; p=none'])
    expect(report.present).toBe(false)
    expect(report.issues.some(issue => issue.code === 'spf-missing')).toBe(true)
  })

  it('parses mechanisms and flags soft fail', () => {
    const report = parseSpf(['v=spf1 include:_spf.google.com ~all'])
    expect(report.present).toBe(true)
    expect(report.mechanisms).toEqual([
      { qualifier: '+', type: 'include', value: '_spf.google.com', raw: 'include:_spf.google.com' },
      { qualifier: '~', type: 'all', value: undefined, raw: '~all' },
    ])
    expect(report.issues.some(issue => issue.code === 'spf-softfail')).toBe(true)
  })

  it('flags missing authorizing permissions', () => {
    const report = parseSpf(['v=spf1 -all'])
    expect(report.issues.some(issue => issue.code === 'spf-no-permissions')).toBe(true)
  })

  it('flags multiple SPF records', () => {
    const report = parseSpf(['v=spf1 -all', 'v=spf1 mx -all'])
    expect(report.issues.some(issue => issue.code === 'spf-multiple')).toBe(true)
  })
})

describe('analyzeMx', () => {
  it('sorts by priority and flags duplicate priorities', () => {
    const report = analyzeMx([
      { priority: 20, exchange: 'b.mail.example.com.' },
      { priority: 10, exchange: 'a.mail.example.com' },
      { priority: 10, exchange: 'c.mail.example.com' },
    ])

    expect(report.records.map(row => row.exchange)).toEqual([
      'a.mail.example.com',
      'c.mail.example.com',
      'b.mail.example.com',
    ])
    expect(report.issues.some(issue => issue.code === 'mx-duplicate-priority')).toBe(true)
  })

  it('flags IP exchange hosts', () => {
    const report = analyzeMx([{ priority: 10, exchange: '203.0.113.10' }])
    expect(report.records[0]?.issues.some(issue => issue.code === 'mx-ip-exchange')).toBe(true)
  })

  it('reports missing MX records', () => {
    const report = analyzeMx([])
    expect(report.issues.some(issue => issue.code === 'mx-missing')).toBe(true)
  })
})

describe('analyzeDkim', () => {
  it('marks selectors with DKIM keys as present', () => {
    const report = analyzeDkim([
      { selector: 'google', records: ['v=DKIM1; k=rsa; p=MIGf'] },
      { selector: 'default', records: [] },
    ])

    expect(report.selectors[0]?.present).toBe(true)
    expect(report.selectors[1]?.present).toBe(false)
    expect(report.issues.some(issue => issue.code === 'dkim-ok')).toBe(true)
  })
})

describe('normalizeDkimSelectors', () => {
  it('uses defaults when input is empty', () => {
    expect(normalizeDkimSelectors()).toContain('google')
    expect(normalizeDkimSelectors('')).toContain('default')
    expect(normalizeDkimSelectors([])).toContain('selector1')
  })

  it('parses a comma-separated list', () => {
    expect(normalizeDkimSelectors('Google, selector1')).toEqual(['google', 'selector1'])
  })

  it('filters out invalid selectors and caps at 10', () => {
    const list = 'sel1, sel2, invalid!selector, sel3, sel4, sel5, sel6, sel7, sel8, sel9, sel10, sel11'
    const res = normalizeDkimSelectors(list)
    expect(res).not.toContain('invalid!selector')
    expect(res.length).toBe(10)
    expect(res).not.toContain('sel11')
  })
})

describe('parseDmarc', () => {
  function codes(records: string[]) {
    return parseDmarc(records).issues.map(item => item.code)
  }

  it('reports a missing record', () => {
    const report = parseDmarc(['v=spf1 mx -all'])
    expect(report.present).toBe(false)
    expect(report.policy).toBeNull()
    expect(report.percent).toBe(0)
    expect(report.issues.map(item => item.code)).toContain('dmarc-missing')
    expect(report.issues[0]?.level).toBe('error')
  })

  it('accepts a strict record', () => {
    const report = parseDmarc(['v=DMARC1; p=reject; rua=mailto:reports@example.com'])
    expect(report.present).toBe(true)
    expect(report.policy).toBe('reject')
    expect(report.percent).toBe(100)
    expect(report.aggregateReportUris).toEqual(['mailto:reports@example.com'])
    expect(report.issues.map(item => item.code)).toEqual(['dmarc-ok'])
  })

  it('warns about a monitor-only policy', () => {
    expect(codes(['v=DMARC1; p=none; rua=mailto:r@example.com'])).toContain('dmarc-policy-none')
  })

  it('warns when no aggregate report address is set', () => {
    expect(codes(['v=DMARC1; p=reject'])).toContain('dmarc-no-rua')
  })

  it('warns about partial coverage', () => {
    const report = parseDmarc(['v=DMARC1; p=reject; pct=50; rua=mailto:r@example.com'])
    expect(report.percent).toBe(50)
    expect(report.issues.map(item => item.code)).toContain('dmarc-partial-pct')
  })

  it('rejects a record with no p tag', () => {
    expect(codes(['v=DMARC1; rua=mailto:r@example.com'])).toContain('dmarc-no-policy')
  })

  it('rejects a bad policy value', () => {
    expect(codes(['v=DMARC1; p=block; rua=mailto:r@example.com'])).toContain('dmarc-bad-policy')
  })

  it('reads the subdomain policy', () => {
    const report = parseDmarc(['v=DMARC1; p=reject; sp=none; rua=mailto:r@example.com'])
    expect(report.subdomainPolicy).toBe('none')
    expect(report.issues.map(item => item.code)).toContain('dmarc-subdomain-none')
  })

  it('reports more than one record', () => {
    expect(codes(['v=DMARC1; p=reject', 'v=DMARC1; p=none'])).toContain('dmarc-multiple')
  })

  it('warns about an unknown tag and a bad report address', () => {
    const found = codes(['v=DMARC1; p=reject; rua=reports@example.com; zz=1'])
    expect(found).toContain('dmarc-unknown-tag')
    expect(found).toContain('dmarc-bad-report-uri')
  })
})

describe('buildEmailHealthResult', () => {
  it('builds a combined report', () => {
    const result = buildEmailHealthResult({
      domain: 'example.com',
      txtRecords: ['v=spf1 mx -all'],
      dmarcRecords: ['v=DMARC1; p=reject; rua=mailto:r@example.com'],
      mxRecords: [{ priority: 10, exchange: 'mail.example.com' }],
      dkim: [{ selector: 'default', records: ['v=DKIM1; p=abc'] }],
    })

    expect(result.domain).toBe('example.com')
    expect(result.spf.present).toBe(true)
    expect(result.mx.records).toHaveLength(1)
    expect(result.dkim.selectors[0]?.present).toBe(true)
    expect(result.dmarc.policy).toBe('reject')
  })
})

describe('issue remediation details', () => {
  it('gives the observed name, the impact, and a fix for a missing SPF record', () => {
    const [first] = parseSpf([], { domain: 'example.com' }).issues
    expect(first?.code).toBe('spf-missing')
    expect(first?.observed).toContain('example.com')
    expect(first?.impact).toBeTruthy()
    expect(first?.fix).toContain('v=spf1')
  })

  it('gives the observed record for every SPF issue that is not ok', () => {
    const report = parseSpf(['v=spf1 +all'], { domain: 'example.com' })
    const detected = report.issues.filter(item => item.level !== 'ok')
    expect(detected.length).toBeGreaterThan(0)
    for (const item of detected) {
      expect(item.observed).toBeTruthy()
      expect(item.impact).toBeTruthy()
      expect(item.fix).toBeTruthy()
    }
  })

  it('gives details for DMARC, MX, and DKIM issues', () => {
    const dmarc = parseDmarc(['v=DMARC1; p=none'], { domain: 'example.com' })
    const mx = analyzeMx([{ priority: 10, exchange: '203.0.113.10' }], { domain: 'example.com' })
    const dkim = analyzeDkim([{ selector: 'default', records: [] }], { domain: 'example.com' })

    for (const item of [
      ...dmarc.issues,
      ...mx.records.flatMap(row => row.issues),
      ...dkim.selectors.flatMap(row => row.issues),
      ...dkim.issues,
    ].filter(entry => entry.level !== 'ok')) {
      expect(item.observed).toBeTruthy()
      expect(item.impact).toBeTruthy()
      expect(item.fix).toBeTruthy()
    }

    expect(parseDmarc([], { domain: 'example.com' }).issues[0]?.observed).toContain('_dmarc.example.com')
  })

  it('parses the redirect modifier', () => {
    const report = parseSpf(['v=spf1 redirect=_spf.example.net'])
    expect(report.mechanisms[0]).toMatchObject({ type: 'redirect', value: '_spf.example.net' })
  })
})

describe('lookup failure versus missing record', () => {
  it('separates a failed SPF query from a missing SPF record', () => {
    const failed = parseSpf([], { domain: 'example.com', lookup: 'failed' })
    const missing = parseSpf([], { domain: 'example.com' })

    expect(failed.issues.map(item => item.code)).toEqual(['spf-lookup-failed'])
    expect(failed.issues[0]?.level).toBe('warning')
    expect(missing.issues.map(item => item.code)).toEqual(['spf-missing'])
    expect(missing.issues[0]?.level).toBe('error')
  })

  it('separates a failed DMARC query from a missing DMARC record', () => {
    const failed = parseDmarc([], { domain: 'example.com', lookup: 'failed' })
    const missing = parseDmarc([], { domain: 'example.com' })

    expect(failed.issues.map(item => item.code)).toEqual(['dmarc-lookup-failed'])
    expect(failed.issues[0]?.level).toBe('warning')
    expect(missing.issues.map(item => item.code)).toEqual(['dmarc-missing'])
  })

  it('separates a failed MX query from a missing MX record', () => {
    expect(analyzeMx([], { domain: 'example.com', lookup: 'failed' }).issues[0]?.code).toBe('mx-lookup-failed')
    expect(analyzeMx([], { domain: 'example.com' }).issues[0]?.code).toBe('mx-missing')
  })

  it('separates a failed DKIM query from a missing v=DKIM1 record', () => {
    const report = analyzeDkim([
      { selector: 'google', records: [], lookup: 'failed' },
      { selector: 'default', records: [] },
    ], { domain: 'example.com' })

    expect(report.selectors[0]?.issues[0]?.code).toBe('dkim-lookup-failed')
    expect(report.selectors[0]?.issues[0]?.level).toBe('warning')
    expect(report.selectors[1]?.issues[0]?.code).toBe('dkim-missing')
  })
})

describe('unchecked DKIM selectors', () => {
  it('lists the tested selectors and the skipped common selectors', () => {
    const report = analyzeDkim([
      { selector: 'google', records: ['v=DKIM1; k=rsa; p=MIGf'] },
      { selector: 'default', records: [] },
    ], { domain: 'example.com' })

    expect(report.tested).toEqual(['google', 'default'])
    expect(report.skipped.map(item => item.selector)).toContain('k1')
    expect(report.skipped.map(item => item.selector)).not.toContain('google')
    expect(report.skipped.every(item => item.provider.length > 0)).toBe(true)

    const note = report.issues.find(item => item.code === 'dkim-enumeration')
    expect(note?.observed).toContain('Checked: google, default')
    expect(note?.observed).toContain('Not checked:')
  })

  it('explains why a selector cannot be enumerated', () => {
    const report = analyzeDkim([{ selector: 'default', records: [] }])
    const note = report.issues.find(item => item.code === 'dkim-enumeration')
    expect(note?.level).toBe('info')
    expect(note?.impact).toContain('_domainkey')
    expect(note?.fix).toContain('DKIM-Signature')
  })
})

describe('parseDkimRecord and rsaKeyBits', () => {
  it('reads the RSA key size', () => {
    expect(rsaKeyBits(RSA_2048)).toBe(2048)
    expect(rsaKeyBits(RSA_1024)).toBe(1024)
  })

  it('returns null for a truncated or invalid key', () => {
    expect(rsaKeyBits('MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQD')).toBeNull()
    expect(rsaKeyBits('')).toBeNull()
  })

  it('parses the k, p, and t tags', () => {
    const key = parseDkimRecord(`v=DKIM1; k=rsa; t=y:s; p=${RSA_2048}`)
    expect(key?.version).toBe('DKIM1')
    expect(key?.keyType).toBe('rsa')
    expect(key?.publicKey).toBe(RSA_2048)
    expect(key?.keyBits).toBe(2048)
    expect(key?.flags).toEqual(['y', 's'])
    expect(key?.testing).toBe(true)
    expect(key?.revoked).toBe(false)
  })

  it('marks an empty p tag as a revoked key', () => {
    const key = parseDkimRecord('v=DKIM1; k=rsa; p=')
    expect(key?.revoked).toBe(true)
    expect(key?.keyBits).toBeNull()
  })

  it('reads an ed25519 key as 256 bits', () => {
    expect(parseDkimRecord('v=DKIM1; k=ed25519; p=11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=')?.keyBits).toBe(256)
  })

  it('ignores a record that is not DKIM', () => {
    expect(parseDkimRecord('v=spf1 -all')).toBeNull()
  })

  it('flags a revoked selector and a weak key', () => {
    const report = analyzeDkim([
      { selector: 'revoked', records: ['v=DKIM1; k=rsa; p='] },
      { selector: 'weak', records: [`v=DKIM1; k=rsa; p=${RSA_1024}`] },
      { selector: 'strong', records: [`v=DKIM1; k=rsa; p=${RSA_2048}`] },
    ], { domain: 'example.com' })

    expect(report.selectors[0]?.issues.map(item => item.code)).toContain('dkim-revoked')
    expect(report.selectors[0]?.issues[0]?.level).toBe('error')
    expect(report.selectors[1]?.key?.keyBits).toBe(1024)
    expect(report.selectors[1]?.issues.map(item => item.code)).toContain('dkim-key-small')
    expect(report.selectors[2]?.issues.map(item => item.code)).toEqual(['dkim-present'])
    expect(report.selectors[2]?.key?.keyBits).toBe(2048)
  })
})

describe('modern mail policies', () => {
  it('reads the MTA-STS record at _mta-sts.<domain>', () => {
    const report = parseMailPolicy('mta-sts', ['v=STSv1; id=20240101T000000'], { domain: 'example.com' })
    expect(report.name).toBe('_mta-sts.example.com')
    expect(report.present).toBe(true)
    expect(report.tags).toEqual([{ name: 'v', value: 'STSv1' }, { name: 'id', value: '20240101T000000' }])
    expect(report.issues.map(item => item.code)).toEqual(['mta-sts-ok'])
  })

  it('reads the TLS report record at _smtp._tls.<domain>', () => {
    const report = parseMailPolicy('tls-rpt', ['v=TLSRPTv1; rua=mailto:tls@example.com'], { domain: 'example.com' })
    expect(report.name).toBe('_smtp._tls.example.com')
    expect(report.present).toBe(true)

    const missingRua = parseMailPolicy('tls-rpt', ['v=TLSRPTv1;'], { domain: 'example.com' })
    expect(missingRua.issues.map(item => item.code)).toContain('tls-rpt-no-rua')
  })

  it('reads the BIMI record at default._bimi.<domain>', () => {
    const report = parseMailPolicy('bimi', ['v=BIMI1; l=https://example.com/logo.svg'], { domain: 'example.com' })
    expect(report.name).toBe('default._bimi.example.com')
    expect(report.present).toBe(true)

    const insecure = parseMailPolicy('bimi', ['v=BIMI1; l=http://example.com/logo.svg'], { domain: 'example.com' })
    expect(insecure.issues.map(item => item.code)).toContain('bimi-insecure-logo')
  })

  it('reports a missing record apart from a failed query', () => {
    expect(parseMailPolicy('mta-sts', [], { domain: 'example.com' }).issues[0]?.code).toBe('mta-sts-missing')
    const failed = parseMailPolicy('mta-sts', [], { domain: 'example.com', lookup: 'failed' })
    expect(failed.issues[0]?.code).toBe('mta-sts-lookup-failed')
    expect(failed.issues[0]?.level).toBe('warning')
  })
})

describe('scoreEmailHealth', () => {
  function build(overrides: Parameters<typeof buildEmailHealthResult>[0]) {
    return buildEmailHealthResult(overrides)
  }

  it('adds points for each check and gives a grade', () => {
    const result = build({
      domain: 'example.com',
      txtRecords: [`v=spf1 include:_spf.example.net -all`],
      dmarcRecords: ['v=DMARC1; p=reject; rua=mailto:r@example.com'],
      mxRecords: [{ priority: 10, exchange: 'mail.example.com' }],
      dkim: [{ selector: 'default', records: [`v=DKIM1; k=rsa; p=${RSA_2048}`] }],
    })
    result.mtaSts = parseMailPolicy('mta-sts', ['v=STSv1; id=1'], { domain: 'example.com' })
    result.tlsRpt = parseMailPolicy('tls-rpt', ['v=TLSRPTv1; rua=mailto:t@example.com'], { domain: 'example.com' })
    result.bimi = parseMailPolicy('bimi', ['v=BIMI1; l=https://example.com/logo.svg'], { domain: 'example.com' })

    const score = scoreEmailHealth(result)
    expect(score.max).toBe(100)
    expect(score.points).toBe(100)
    expect(score.grade).toBe('A')
    expect(score.lines.map(line => line.label)).toContain('MTA-STS')
    expect(score.lines.every(line => line.detail.length > 0)).toBe(true)
  })

  it('gives a low grade to a domain with no records', () => {
    const score = scoreEmailHealth(build({
      domain: 'example.com',
      txtRecords: [],
      dmarcRecords: [],
      mxRecords: [],
      dkim: [{ selector: 'default', records: [] }],
    }))

    expect(score.points).toBe(0)
    expect(score.grade).toBe('F')
  })

  it('does not lower the grade when a DNS query fails', () => {
    const score = scoreEmailHealth(build({
      domain: 'example.com',
      txtRecords: [],
      dmarcRecords: ['v=DMARC1; p=reject; rua=mailto:r@example.com'],
      mxRecords: [{ priority: 10, exchange: 'mail.example.com' }],
      dkim: [{ selector: 'default', records: [`v=DKIM1; k=rsa; p=${RSA_2048}`] }],
      lookups: { txt: 'failed' },
    }))

    const spfLines = score.lines.filter(line => line.label.startsWith('SPF'))
    expect(spfLines).toHaveLength(1)
    expect(spfLines[0]?.max).toBe(0)
    expect(score.grade).toBe('A')
  })
})
