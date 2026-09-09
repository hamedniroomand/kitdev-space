import { describe, expect, it } from 'vitest'
import { describeExpiry, EXPIRY_WARNING_DAYS, explainEppStatus } from '#shared/utils/network/epp-status'

describe('explainEppStatus', () => {
  it('explains a client status code in plain English', () => {
    expect(explainEppStatus('clientTransferProhibited')).toBe(
      'The registrar blocks a transfer of the domain to a different registrar.',
    )
  })

  it('matches the RDAP form with spaces and the EPP form without them', () => {
    expect(explainEppStatus('client transfer prohibited')).toBe(explainEppStatus('clientTransferProhibited'))
    expect(explainEppStatus('REDEMPTION-PERIOD')).toBe(explainEppStatus('redemptionPeriod'))
  })

  it('separates the registrar lock from the registry lock', () => {
    expect(explainEppStatus('clientHold')).toContain('registrar')
    expect(explainEppStatus('serverHold')).toContain('registry')
  })

  it('never returns a bare acronym for an unknown code', () => {
    const text = explainEppStatus('someNewStatus')
    expect(text).toContain('some new status')
    expect(text.length).toBeGreaterThan(20)
  })

  it('gives a sentence for every known code', () => {
    const codes = ['ok', 'inactive', 'pendingDelete', 'autoRenewPeriod', 'serverUpdateProhibited']
    for (const code of codes) {
      expect(explainEppStatus(code).endsWith('.')).toBe(true)
    }
  })
})

describe('describeExpiry', () => {
  it('warns before the expiry date', () => {
    expect(describeExpiry(10)).toBe('The registration expires in 10 days. Renew the domain to keep it.')
  })

  it('reports a past expiry date', () => {
    expect(describeExpiry(-5)).toBe('The registration expired 5 days ago.')
  })

  it('reports the last day', () => {
    expect(describeExpiry(0)).toBe('The registration expires today.')
  })

  it('keeps the warning window at 30 days', () => {
    expect(EXPIRY_WARNING_DAYS).toBe(30)
  })
})
