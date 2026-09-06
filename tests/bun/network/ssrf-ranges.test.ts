import { describe, expect, it } from 'bun:test'
import { assertSafeUrl, TLS_PORTS } from '#server/utils/network/ssrf'

function rejects(url: string, options?: { allowedPorts?: readonly number[] }) {
  return expect(assertSafeUrl(url, options)).rejects.toMatchObject({ statusCode: 400 })
}

describe('assertSafeUrl blocks the remaining IPv4 ranges', () => {
  it('rejects carrier NAT (100.64.0.0/10)', async () => {
    await rejects('http://100.64.1.1/')
  })

  it('rejects IETF protocol assignments (192.0.0.0/24)', async () => {
    await rejects('http://192.0.0.1/')
  })

  it('rejects the benchmark range (198.18.0.0/15)', async () => {
    await rejects('http://198.18.0.1/')
  })

  it('rejects multicast (224.0.0.0/4)', async () => {
    await rejects('http://224.0.0.1/')
  })

  it('rejects the reserved range and broadcast (240.0.0.0/4)', async () => {
    await rejects('http://255.255.255.255/')
  })
})

describe('assertSafeUrl blocks IPv6 forms that carry an IPv4 address', () => {
  it('rejects an IPv4-mapped loopback address', async () => {
    await rejects('http://[::ffff:127.0.0.1]/')
  })

  it('rejects an IPv4-mapped metadata address', async () => {
    await rejects('http://[::ffff:169.254.169.254]/')
  })

  it('rejects NAT64 (64:ff9b::/96)', async () => {
    await rejects('http://[64:ff9b::7f00:1]/')
  })

  it('rejects 6to4 (2002::/16)', async () => {
    await rejects('http://[2002:7f00:1::1]/')
  })

  it('rejects Teredo (2001::/32)', async () => {
    await rejects('http://[2001:0:1::1]/')
  })
})

describe('assertSafeUrl restricts the port', () => {
  it('rejects a port outside the web list', async () => {
    await rejects('http://93.184.216.34:22/')
  })

  it('rejects a database port', async () => {
    await rejects('http://93.184.216.34:5432/')
  })

  it('rejects a web port for a TLS caller', async () => {
    await rejects('https://93.184.216.34:8080/', { allowedPorts: TLS_PORTS })
  })

  it('accepts an explicit default port', async () => {
    const url = await assertSafeUrl('https://93.184.216.34:443/')
    expect(url.hostname).toBe('93.184.216.34')
  })

  it('accepts a TLS port for a TLS caller', async () => {
    const url = await assertSafeUrl('https://93.184.216.34:993/', { allowedPorts: TLS_PORTS })
    expect(url.port).toBe('993')
  })
})

describe('assertSafeUrl blocks internal hostnames', () => {
  it('rejects a .internal name', async () => {
    await rejects('http://db.service.internal/')
  })

  it('rejects a .localhost name', async () => {
    await rejects('http://api.localhost/')
  })

  it('rejects the bare metadata name', async () => {
    await rejects('http://metadata/')
  })
})
