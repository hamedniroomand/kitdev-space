export const legacyRedirects: Record<string, string> = {
  // Category roots
  '/data': '/hub/data/json-formatter',
  '/network': '/hub/network/dns-lookup',
  '/crypto': '/hub/crypto/hash-generator',
  '/color': '/hub/color/converter',
  '/image': '/hub/image/converter',
  '/dev': '/hub/dev/cron',

  // Renamed tool slugs
  '/network/dns': '/hub/network/dns-lookup',
  '/network/headers': '/hub/network/http-headers',
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

  // Network tools
  '/network/og-preview': '/hub/network/og-preview',
  '/network/redirect': '/hub/network/redirect',

  // Crypto tools
  '/crypto/uuid': '/hub/crypto/uuid',
  '/crypto/base64': '/hub/crypto/base64',
  '/crypto/hex': '/hub/crypto/hex',
  '/crypto/random-string': '/hub/crypto/random-string',
  '/crypto/password-benchmark': '/hub/crypto/password-benchmark',

  // Color tools
  '/color/converter': '/hub/color/converter',
  '/color/inspector': '/hub/color/inspector',

  // Image tools
  '/image/converter': '/hub/image/converter',
  '/image/resizer': '/hub/image/resizer',
  '/image/transform': '/hub/image/transform',
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
