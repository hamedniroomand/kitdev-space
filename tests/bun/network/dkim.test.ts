import type { DkimResolvers } from '#server/utils/network/dkim'
import { describe, expect, it } from 'bun:test'
import { lookupDkimSelector, lookupDkimSelectors } from '#server/utils/network/dkim'

function resolvers(fixture: {
  txt?: Record<string, string[]>
  cname?: Record<string, string[]>
  fail?: string[]
}): DkimResolvers {
  return {
    txt: (name) => {
      if (fixture.fail?.includes(name)) {
        return Promise.reject(new Error('The lookup failed.'))
      }
      return Promise.resolve(fixture.txt?.[name] ?? [])
    },
    cname: name => Promise.resolve(fixture.cname?.[name] ?? []),
  }
}

describe('lookupDkimSelector', () => {
  it('reads the TXT record of the selector', async () => {
    const input = await lookupDkimSelector('example.com', 'google', resolvers({
      txt: { 'google._domainkey.example.com': ['v=DKIM1; k=rsa; p=abc'] },
    }))

    expect(input).toEqual({
      selector: 'google',
      records: ['v=DKIM1; k=rsa; p=abc'],
      lookup: 'ok',
      cname: null,
    })
  })

  it('follows a CNAME that points at a third-party key', async () => {
    const input = await lookupDkimSelector('example.com', 's1', resolvers({
      cname: { 's1._domainkey.example.com': ['s1.domainkey.u1.wl.sendgrid.net.'] },
      txt: { 's1.domainkey.u1.wl.sendgrid.net': ['v=DKIM1; k=rsa; p=zzz'] },
    }))

    expect(input.cname).toBe('s1.domainkey.u1.wl.sendgrid.net')
    expect(input.records).toEqual(['v=DKIM1; k=rsa; p=zzz'])
    expect(input.lookup).toBe('ok')
  })

  it('marks the lookup as failed when the resolver returns an error', async () => {
    const input = await lookupDkimSelector('example.com', 'default', resolvers({
      fail: ['default._domainkey.example.com'],
    }))

    expect(input.lookup).toBe('failed')
    expect(input.records).toEqual([])
  })

  it('reads every selector', async () => {
    const inputs = await lookupDkimSelectors('example.com', ['a', 'b'], resolvers({}))
    expect(inputs.map(item => item.selector)).toEqual(['a', 'b'])
  })
})
