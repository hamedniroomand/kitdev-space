export const legacyRedirects: Record<string, string> = {
  // Category roots
  '/data': '/hub/data',
  '/network': '/hub/network',
  '/crypto': '/hub/crypto',
  '/color': '/hub/color',
  '/image': '/hub/image',
  '/dev': '/hub/dev',

  // Renamed tool slugs
  '/network/dns': '/hub/network/dns-lookup',
  '/network/headers': '/hub/network/http-inspector',
  '/network/url': '/hub/network/url-inspector',
  '/crypto/hash': '/hub/crypto/hash-generator',
  '/color/contrast': '/hub/color/contrast-checker',
  '/color/palette': '/hub/color/palette-generator',

  // Data tools
  '/data/json-formatter': '/hub/data/json-formatter',
  '/data/json-validator': '/hub/data/json-formatter',
  '/data/json-minifier': '/hub/data/json-formatter',
  '/hub/data/json-validator': '/hub/data/json-formatter',
  '/hub/data/json-minifier': '/hub/data/json-formatter',
  '/data/json-to-typescript': '/hub/data/json-to-typescript',
  '/data/converters/json-yaml': '/hub/data/converters/json-yaml',
  '/data/converters/json-toml': '/hub/data/converters/json-toml',
  '/data/converters/json-xml': '/hub/data/converters/json-xml',
  '/data/text-diff': '/hub/data/text-diff',
  '/data/converters/json-json5': '/hub/data/converters/json-json5',
  '/data/sql-formatter': '/hub/data/sql-formatter',
  '/hub/dev/sql-formatter': '/hub/data/sql-formatter',

  // Network tools
  '/network/og-preview': '/hub/network/og-preview',
  '/hub/network/http-headers': '/hub/network/http-inspector',
  '/hub/network/security-headers': '/hub/network/http-inspector',
  '/hub/network/redirect': '/hub/network/http-inspector',
  '/network/redirect': '/hub/network/http-inspector',

  // Crypto tools
  '/crypto/uuid': '/hub/crypto/uuid',
  '/hub/crypto/base64': '/hub/dev/encoder',
  '/hub/crypto/hex': '/hub/dev/encoder',
  '/hub/dev/html-url-codec': '/hub/dev/encoder',
  '/hub/dev/string-escape': '/hub/dev/encoder',
  '/crypto/base64': '/hub/dev/encoder',
  '/crypto/hex': '/hub/dev/encoder',
  '/dev/html-url-codec': '/hub/dev/encoder',
  '/dev/string-escape': '/hub/dev/encoder',
  '/crypto/random-string': '/hub/crypto/random-string',
  '/crypto/password-benchmark': '/hub/crypto/password-benchmark',

  // Color tools
  '/color/converter': '/hub/color/converter',
  '/color/inspector': '/hub/color/inspector',

  // Image tools
  '/hub/image/exif-stripper': '/hub/image/metadata',
  '/image/exif-stripper': '/hub/image/metadata',
  '/hub/image/converter': '/hub/image/studio',
  '/hub/image/resizer': '/hub/image/studio',
  '/hub/image/transform': '/hub/image/studio',
  '/image/converter': '/hub/image/studio',
  '/image/resizer': '/hub/image/studio',
  '/image/transform': '/hub/image/studio',
  '/image/metadata': '/hub/image/metadata',

  // Dev tools
  '/dev/cron': '/hub/dev/cron',
  '/dev/semver': '/hub/dev/semver',
  '/dev/transpiler': '/hub/dev/transpiler',
  '/dev/tar': '/hub/dev/tar'
}

const legacyPrefixes = ['/data/', '/network/', '/crypto/', '/color/', '/image/', '/dev/']

export function resolveLegacyRedirect(path: string): string | null {
  const normalized = path.replace(/\/+$/, '') || '/'

  if (legacyRedirects[normalized]) {
    return legacyRedirects[normalized]
  }

  for (const prefix of legacyPrefixes) {
    if (normalized.startsWith(prefix)) {
      return `/hub${normalized}`
    }
  }

  return null
}
