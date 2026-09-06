import { describe, expect, it } from 'vitest'
import { parseUserAgent } from '#shared/utils/network/user-agent'

describe('parseUserAgent', () => {
  it('parses modern Chrome on macOS', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    const res = parseUserAgent(ua)
    expect(res.browser.name).toBe('Chrome')
    expect(res.browser.major).toBe('124')
    expect(res.os.name).toBe('macOS')
    expect(res.os.version).toBe('10.15.7')
    expect(res.device.type).toBe('desktop')
    expect(res.isBot).toBe(false)
  })

  it('parses Safari on iPhone', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
    const res = parseUserAgent(ua)
    expect(res.browser.name).toBe('Safari')
    expect(res.browser.major).toBe('17')
    expect(res.os.name).toBe('iOS')
    expect(res.os.version).toBe('17.4')
    expect(res.device.type).toBe('mobile')
    expect(res.device.model).toBe('iPhone')
  })

  it('detects bots correctly', () => {
    const ua = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
    const res = parseUserAgent(ua)
    expect(res.isBot).toBe(true)
    expect(res.browser.name).toBe('Googlebot')
  })

  it('handles empty input gracefully', () => {
    const res = parseUserAgent('')
    expect(res.browser.name).toBe('Unknown')
    expect(res.device.type).toBe('unknown')
  })
})
