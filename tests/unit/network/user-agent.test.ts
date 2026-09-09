import { describe, expect, it } from 'vitest'
import { normalizeClientHints, parseUserAgent } from '#shared/utils/network/user-agent'

describe('parseUserAgent', () => {
  it('parses modern Chrome on macOS', async () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    const res = await parseUserAgent(ua)
    expect(res.browser.name).toBe('Chrome')
    expect(res.browser.major).toBe('124')
    expect(res.os.name).toBe('macOS')
    expect(res.os.version).toBe('10.15.7')
    expect(res.engine.name).toBe('Blink')
    expect(res.device.type).toBe('desktop')
    expect(res.isBot).toBe(false)
    expect(res.isFrozen).toBe(true)
  })

  it('parses Safari on iPhone', async () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
    const res = await parseUserAgent(ua)
    expect(res.browser.name).toBe('Mobile Safari')
    expect(res.browser.major).toBe('17')
    expect(res.os.name).toBe('iOS')
    expect(res.os.version).toBe('17.4')
    expect(res.device.type).toBe('mobile')
    expect(res.device.model).toBe('iPhone')
  })

  it('parses the CriOS token as Chrome, not as Safari', async () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.111 Mobile/15E148 Safari/604.1'
    const res = await parseUserAgent(ua)
    expect(res.browser.name).toBe('Mobile Chrome')
    expect(res.browser.major).toBe('124')
    expect(res.os.name).toBe('iOS')
    expect(res.device.type).toBe('mobile')
    expect(res.isBot).toBe(false)
  })

  it('parses the EdgA token as Edge, not as Chrome', async () => {
    const ua = 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 EdgA/124.0.2478.50'
    const res = await parseUserAgent(ua)
    expect(res.browser.name).toBe('Edge')
    expect(res.browser.version).toBe('124.0.2478.50')
    expect(res.os.name).toBe('Android')
    expect(res.os.version).toBe('13')
    expect(res.device.type).toBe('mobile')
  })

  it('parses Internet Explorer 11, which has no browser token', async () => {
    const ua = 'Mozilla/5.0 (Windows NT 6.1; Trident/7.0; rv:11.0) like Gecko'
    const res = await parseUserAgent(ua)
    expect(res.browser.name).toBe('IE')
    expect(res.browser.major).toBe('11')
    expect(res.engine.name).toBe('Trident')
    expect(res.os.name).toBe('Windows')
    expect(res.device.type).toBe('desktop')
    expect(res.isBot).toBe(false)
  })

  it('parses a Go HTTP client as a library, not as a browser', async () => {
    const res = await parseUserAgent('Go-http-client/2.0')
    expect(res.browser.name).toBe('Go-http-client')
    expect(res.browser.type).toBe('library')
    expect(res.isBot).toBe(true)
    expect(res.device.type).toBe('bot')
    expect(res.os.name).toBe('Unknown')
    expect(res.engine.name).toBe('Unknown')
  })

  it('detects bots correctly', async () => {
    const ua = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
    const res = await parseUserAgent(ua)
    expect(res.isBot).toBe(true)
    expect(res.browser.name).toBe('Googlebot')
    expect(res.browser.type).toBe('crawler')
  })

  it('gives Unknown for a string that it does not know', async () => {
    const res = await parseUserAgent('qwerty 12345 not-a-user-agent')
    expect(res.browser.name).toBe('Unknown')
    expect(res.browser.version).toBe('')
    expect(res.os.name).toBe('Unknown')
    expect(res.engine.name).toBe('Unknown')
    expect(res.device.type).toBe('unknown')
    expect(res.isBot).toBe(false)
  })

  it('handles empty input gracefully', async () => {
    const res = await parseUserAgent('')
    expect(res.browser.name).toBe('Unknown')
    expect(res.device.type).toBe('unknown')
  })
})

describe('normalizeClientHints', () => {
  it('reads the low entropy values', () => {
    const hints = normalizeClientHints({
      brands: [
        { brand: 'Chromium', version: '124' },
        { brand: 'Not-A.Brand', version: '99' },
      ],
      mobile: false,
      platform: 'macOS',
    })
    expect(hints).toEqual({
      brands: [
        { brand: 'Chromium', version: '124' },
        { brand: 'Not-A.Brand', version: '99' },
      ],
      mobile: false,
      platform: 'macOS',
    })
  })

  it('gives null when the browser has no Client Hints', () => {
    expect(normalizeClientHints(undefined)).toBeNull()
    expect(normalizeClientHints(null)).toBeNull()
    expect(normalizeClientHints({})).toBeNull()
  })
})
