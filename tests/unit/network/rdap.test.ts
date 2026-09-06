import { describe, expect, it } from 'vitest'
import type { RdapBootstrapService } from '#server/utils/network/rdap'
import { parseRdapData, parseRdapEntity, resolveRdapBase } from '#server/utils/network/rdap'

describe('rdap parser', () => {
  it('parses entity vcard fields', () => {
    const rawEntity = {
      roles: ['registrar'],
      publicIds: [{ type: 'IANA Registrar ID', identifier: '292' }],
      vcardArray: [
        'vcard',
        [
          ['version', {}, 'text', '4.0'],
          ['fn', {}, 'text', 'MarkMonitor Inc.'],
          ['email', {}, 'text', 'abusecomplaints@markmonitor.com'],
          ['tel', {}, 'uri', '+1.2083895740']
        ]
      ]
    }

    const registrar = parseRdapEntity(rawEntity)
    expect(registrar.name).toBe('MarkMonitor Inc.')
    expect(registrar.abuseEmail).toBe('abusecomplaints@markmonitor.com')
    expect(registrar.abusePhone).toBe('+1.2083895740')
    expect(registrar.ianaId).toBe('292')
  })

  it('parses domain RDAP payload correctly', () => {
    const samplePayload = {
      ldhName: 'EXAMPLE.COM',
      status: ['clientDeleteProhibited', 'clientTransferProhibited'],
      events: [
        { eventAction: 'registration', eventDate: '1995-08-14T04:00:00Z' },
        { eventAction: 'expiration', eventDate: '2028-08-13T04:00:00Z' },
        { eventAction: 'last changed', eventDate: '2024-08-14T07:00:00Z' }
      ],
      nameservers: [
        { ldhName: 'A.IANA-SERVERS.NET' },
        { ldhName: 'B.IANA-SERVERS.NET' }
      ],
      secureDNS: {
        delegationSigned: true
      },
      entities: [
        {
          roles: ['registrar'],
          vcardArray: [
            'vcard',
            [['fn', {}, 'text', 'RESERVED-Internet Assigned Numbers Authority']]
          ]
        }
      ]
    }

    const result = parseRdapData(samplePayload, 'example.com', 'domain')

    expect(result.found).toBe(true)
    expect(result.registrationDate).toBe('1995-08-14T04:00:00.000Z')
    expect(result.expirationDate).toBe('2028-08-13T04:00:00.000Z')
    expect(result.nameservers).toEqual(['a.iana-servers.net', 'b.iana-servers.net'])
    expect(result.dnssec).toBe(true)
    expect(result.registrar?.name).toBe('RESERVED-Internet Assigned Numbers Authority')
    expect(result.status).toContain('clientDeleteProhibited')
  })

  const bootstrap: RdapBootstrapService[] = [
    [['dev', 'app', 'page'], ['https://pubapi.registry.google/rdap/']],
    [['com', 'net'], ['http://rdap.verisign.com/com/v1/', 'https://rdap.verisign.com/com/v1/']],
    [['co.uk'], ['https://rdap.nominet.uk/uk/']]
  ]

  it('resolves the authoritative server of a domain from the bootstrap table', () => {
    expect(resolveRdapBase('example.dev', bootstrap)).toBe('https://pubapi.registry.google/rdap/')
    expect(resolveRdapBase('KitDev.Space.APP', bootstrap)).toBe('https://pubapi.registry.google/rdap/')
  })

  it('prefers https and adds the trailing slash', () => {
    expect(resolveRdapBase('example.com', [[['com'], ['http://a.example/', 'https://b.example']]])).toBe('https://b.example/')
  })

  it('matches the longest suffix first', () => {
    expect(resolveRdapBase('example.co.uk', bootstrap)).toBe('https://rdap.nominet.uk/uk/')
  })

  it('returns null for a TLD that is not in the table', () => {
    expect(resolveRdapBase('example.space', bootstrap)).toBeNull()
    expect(resolveRdapBase('localhost', bootstrap)).toBeNull()
  })
})
