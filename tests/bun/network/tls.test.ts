import type { AddressInfo } from 'node:net'
import tls from 'node:tls'
import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { inspectTlsCertificate, parseHostInput, readTlsCertificate } from '#server/utils/network/tls'

// A test only key pair. It is self-signed, it covers ::1 and 127.0.0.1, and it
// serves no real host. Do not use it outside this test.
const TEST_KEY = `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEINwZUvd23z3pY/80+iAjHmDCv1X0/9o+mGmyK0AjSzhioAoGCCqGSM49
AwEHoUQDQgAEQHP3eDkaRwMR9Id2i73whSD0GLTDzuwMgF74JuBRmAk1elzzCzkb
Z7Rgc6f3L3DWTdmTovgINhwQWlaTbQRJRA==
-----END EC PRIVATE KEY-----
`

const TEST_CERT = `-----BEGIN CERTIFICATE-----
MIICXTCCAgKgAwIBAgIUDAzY0GHJlf1Po8TdZaVC2Q2PTfswCgYIKoZIzj0EAwIw
KzEYMBYGA1UEAwwPa2l0ZGV2LXRscy10ZXN0MQ8wDQYDVQQKDAZLaXREZXYwIBcN
MjYwOTA5MTU0MTM2WhgPMjEyNjA4MTYxNTQxMzZaMCsxGDAWBgNVBAMMD2tpdGRl
di10bHMtdGVzdDEPMA0GA1UECgwGS2l0RGV2MFkwEwYHKoZIzj0CAQYIKoZIzj0D
AQcDQgAEQHP3eDkaRwMR9Id2i73whSD0GLTDzuwMgF74JuBRmAk1elzzCzkbZ7Rg
c6f3L3DWTdmTovgINhwQWlaTbQRJRKOCAQAwgf0wHQYDVR0OBBYEFFgjHsH3aUEQ
tf+OXo3QwZBQKYMGMB8GA1UdIwQYMBaAFFgjHsH3aUEQtf+OXo3QwZBQKYMGMA8G
A1UdEwEB/wQFMAMBAf8wLAYDVR0RBCUwI4cQAAAAAAAAAAAAAAAAAAAAAYcEfwAA
AYIJbG9jYWxob3N0MBMGA1UdJQQMMAoGCCsGAQUFBwMBMDQGCCsGAQUFBwEBBCgw
JjAkBggrBgEFBQcwAYYYaHR0cDovL29jc3AudGVzdC5pbnZhbGlkMDEGA1UdHwQq
MCgwJqAkoCKGIGh0dHA6Ly9jcmwudGVzdC5pbnZhbGlkL3Rlc3QuY3JsMAoGCCqG
SM49BAMCA0kAMEYCIQCsI5PV0DskQ3WMLxH8xiU7a7rQKus3P2RmumIIQfgK1AIh
AP6wahWOSARTeoY4Swjrs5g4h2Y+7Woi5Fa2iancE1Pq
-----END CERTIFICATE-----
`

let server: tls.Server
let port = 0

beforeAll(async () => {
  server = tls.createServer({ key: TEST_KEY, cert: TEST_CERT }, socket => socket.end())
  // Port 0 lets the operating system pick a free port.
  await new Promise<void>(resolve => server.listen(0, '::1', () => resolve()))
  port = (server.address() as AddressInfo).port
})

afterAll(() => {
  server?.close()
})

describe('tls inspection over IPv6', () => {
  it('reads the certificate of an IPv6 host', async () => {
    const report = await readTlsCertificate('::1', port)

    expect(report.host).toBe('::1')
    expect(report.port).toBe(port)
    expect(report.subject.commonName).toBe('kitdev-tls-test')
    expect(report.protocol).toStartWith('TLS')
    expect(report.cipher.name.length).toBeGreaterThan(0)
    expect(report.chain).toHaveLength(1)
    // The certificate lists the IPv6 address in its alternative names.
    expect(report.matchesHost).toBe(true)
    expect(report.isSelfSigned).toBe(true)
    expect(report.authorized).toBe(false)
  })

  it('reads the X.509 details of each chain certificate', async () => {
    const report = await readTlsCertificate('::1', port)
    const leaf = report.chain[0]!

    expect(leaf.keyType).toBe('ec')
    expect(leaf.curve).toBe('prime256v1')
    expect(leaf.signatureAlgorithm).toBe('ECDSA with SHA-256')
    expect(leaf.extendedKeyUsage).toEqual(['TLS server authentication'])
    expect(leaf.ocspUrls).toEqual(['http://ocsp.test.invalid'])
    expect(leaf.crlUrls).toEqual(['http://crl.test.invalid/test.crl'])
    expect(leaf.pem).toStartWith('-----BEGIN CERTIFICATE-----')
  })

  it('parses a bracketed IPv6 host and port', () => {
    expect(parseHostInput(`[::1]:${port}`)).toEqual({ host: '::1', port })
  })

  it('keeps the SSRF guard for a bracketed loopback address', async () => {
    // The guard blocks every loopback address. The bracket form must reach the
    // guard, and must not fail earlier as an invalid URL.
    expect(inspectTlsCertificate('[::1]:443')).rejects.toThrow('This host is not allowed.')
  })
})
