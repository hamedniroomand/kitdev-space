import { describe, expect, it } from 'vitest'
import { legacyRedirects, resolveLegacyRedirect } from '#shared/utils/redirects'

describe('legacy redirects', () => {
  it('contains category roots and renamed tool slugs', () => {
    expect(legacyRedirects['/data']).toBe('/hub/data')
    expect(legacyRedirects['/network']).toBe('/hub/network')
    expect(legacyRedirects['/crypto']).toBe('/hub/crypto')
    expect(legacyRedirects['/network/dns']).toBe('/hub/network/dns-lookup')
    expect(legacyRedirects['/network/headers']).toBe('/hub/network/http-inspector')
    expect(legacyRedirects['/network/url']).toBe('/hub/network/url-inspector')
    expect(legacyRedirects['/crypto/hash']).toBe('/hub/crypto/hash-generator')
    expect(legacyRedirects['/color/contrast']).toBe('/hub/color/contrast-checker')
    expect(legacyRedirects['/color/palette']).toBe('/hub/color/palette-generator')
  })

  it('resolves exact legacy paths', () => {
    expect(resolveLegacyRedirect('/data')).toBe('/hub/data')
    expect(resolveLegacyRedirect('/data/json-formatter')).toBe('/hub/data/json-formatter')
    expect(resolveLegacyRedirect('/data/json-validator')).toBe('/hub/data/json-formatter')
    expect(resolveLegacyRedirect('/data/json-minifier')).toBe('/hub/data/json-formatter')
    expect(resolveLegacyRedirect('/hub/data/json-validator')).toBe('/hub/data/json-formatter')
    expect(resolveLegacyRedirect('/hub/data/json-minifier')).toBe('/hub/data/json-formatter')
    expect(resolveLegacyRedirect('/crypto/uuid')).toBe('/hub/crypto/uuid')
    expect(resolveLegacyRedirect('/hub/data/converters/json-json5')).toBe('/hub/data/json-formatter')
    expect(resolveLegacyRedirect('/crypto/passphrase')).toBe('/hub/crypto/passphrase')
    expect(resolveLegacyRedirect('/hub/crypto/base64')).toBe('/hub/dev/base64')
    expect(resolveLegacyRedirect('/hub/crypto/hex')).toBe('/hub/dev/encoder')
    expect(resolveLegacyRedirect('/hub/dev/html-url-codec')).toBe('/hub/dev/encoder')
    expect(resolveLegacyRedirect('/hub/dev/string-escape')).toBe('/hub/dev/encoder')
    expect(resolveLegacyRedirect('/image/converter')).toBe('/hub/image/converter')
    expect(resolveLegacyRedirect('/hub/image/exif-stripper')).toBe('/hub/image/metadata')
    expect(resolveLegacyRedirect('/hub/image/transform')).toBe('/hub/image/studio')
    expect(resolveLegacyRedirect('/hub/network/http-headers')).toBe('/hub/network/http-inspector')
    expect(resolveLegacyRedirect('/hub/network/security-headers')).toBe('/hub/network/http-inspector')
    expect(resolveLegacyRedirect('/hub/network/redirect')).toBe('/hub/network/http-inspector')
    expect(resolveLegacyRedirect('/dev/cron')).toBe('/hub/dev/cron')
    expect(resolveLegacyRedirect('/data/sql-formatter')).toBe('/hub/data/sql-formatter')
    expect(resolveLegacyRedirect('/hub/dev/sql-formatter')).toBe('/hub/data/sql-formatter')
  })

  it('handles paths with trailing slashes', () => {
    expect(resolveLegacyRedirect('/network/dns/')).toBe('/hub/network/dns-lookup')
    expect(resolveLegacyRedirect('/data/')).toBe('/hub/data')
    expect(resolveLegacyRedirect('/color/contrast/')).toBe('/hub/color/contrast-checker')
  })

  it('uses prefix fallback for unmapped legacy paths', () => {
    expect(resolveLegacyRedirect('/data/custom-tool')).toBe('/hub/data/custom-tool')
    expect(resolveLegacyRedirect('/image/custom-tool')).toBe('/hub/image/custom-tool')
  })

  it('keeps the variant routes as real pages', () => {
    for (const route of ['/hub/crypto/uuid', '/hub/crypto/passphrase', '/hub/dev/base64', '/hub/image/resizer', '/hub/image/converter', '/hub/dev/svg-component']) {
      expect(resolveLegacyRedirect(route)).toBeNull()
      expect(legacyRedirects[route]).toBeUndefined()
    }
  })

  it('returns null for non-legacy routes', () => {
    expect(resolveLegacyRedirect('/')).toBeNull()
    expect(resolveLegacyRedirect('/about')).toBeNull()
    expect(resolveLegacyRedirect('/hub')).toBeNull()
    expect(resolveLegacyRedirect('/hub/data')).toBeNull()
    expect(resolveLegacyRedirect('/hub/data/json-formatter')).toBeNull()
    expect(resolveLegacyRedirect('/unknown')).toBeNull()
  })
})
