import { describe, expect, it } from 'vitest'
import { buildWifiPayload, buildQrPayload, generateQrSvg } from '#shared/utils/dev/qrcode'

describe('qrcode', () => {
  it('builds wifi payloads', () => {
    expect(buildWifiPayload({
      ssid: 'Cafe;Net',
      password: 'p@ss',
      security: 'WPA'
    })).toBe('WIFI:T:WPA;S:Cafe\\;Net;P:p@ss;H:false;;')
  })

  it('builds url payloads', () => {
    expect(buildQrPayload('url', 'https://example.com')).toBe('https://example.com')
  })

  it('generates svg markup', () => {
    const svg = generateQrSvg('hello')
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
  })
})
