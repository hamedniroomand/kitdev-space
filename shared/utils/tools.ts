import type { Tool, ToolCategory } from '../../app/types/tools'

export const categoryLabels: Record<ToolCategory, string> = {
  data: 'Data Lab',
  crypto: 'Crypto Lab',
  color: 'Color Lab',
  network: 'Network Lab',
  image: 'Image Lab',
  dev: 'Dev Lab'
}

export const tools: Tool[] = [
  {
    id: 'json-formatter',
    slug: 'json-formatter',
    name: 'JSON Formatter',
    description: 'Format and validate JSON.',
    category: 'data',
    icon: 'i-lucide-braces',
    keywords: ['json', 'format', 'pretty', 'beautify'],
    route: '/hub/data/json-formatter',
    clientOnly: true,
    serverRequired: false,
    status: 'available'
  },
  {
    id: 'json-validator',
    slug: 'json-validator',
    name: 'JSON Validator',
    description: 'Validate JSON and show clear errors.',
    category: 'data',
    icon: 'i-lucide-circle-check',
    keywords: ['json', 'validate', 'lint'],
    route: '/hub/data/json-validator',
    clientOnly: true,
    serverRequired: false,
    status: 'available'
  },
  {
    id: 'json-minifier',
    slug: 'json-minifier',
    name: 'JSON Minifier',
    description: 'Minify JSON for smaller payloads.',
    category: 'data',
    icon: 'i-lucide-minimize-2',
    keywords: ['json', 'minify', 'compress'],
    route: '/hub/data/json-minifier',
    clientOnly: true,
    serverRequired: false,
    status: 'available'
  },
  {
    id: 'json-to-typescript',
    slug: 'json-to-typescript',
    name: 'JSON → TypeScript',
    description: 'Convert JSON into TypeScript interfaces.',
    category: 'data',
    icon: 'i-lucide-file-type',
    keywords: ['json', 'typescript', 'interface', 'types'],
    route: '/hub/data/json-to-typescript',
    clientOnly: true,
    serverRequired: false,
    status: 'available'
  },
  {
    id: 'json-yaml',
    slug: 'json-yaml',
    name: 'JSON ↔ YAML',
    description: 'Convert between JSON and YAML.',
    category: 'data',
    icon: 'i-lucide-arrow-left-right',
    keywords: ['json', 'yaml', 'yml', 'convert'],
    route: '/hub/data/converters/json-yaml',
    clientOnly: false,
    serverRequired: true,
    status: 'available'
  },
  {
    id: 'json-toml',
    slug: 'json-toml',
    name: 'JSON ↔ TOML',
    description: 'Convert between JSON and TOML.',
    category: 'data',
    icon: 'i-lucide-arrow-left-right',
    keywords: ['json', 'toml', 'convert'],
    route: '/hub/data/converters/json-toml',
    clientOnly: false,
    serverRequired: true,
    status: 'available'
  },
  {
    id: 'json-xml',
    slug: 'json-xml',
    name: 'JSON ↔ XML',
    description: 'Convert between JSON and XML.',
    category: 'data',
    icon: 'i-lucide-arrow-left-right',
    keywords: ['json', 'xml', 'convert'],
    route: '/hub/data/converters/json-xml',
    clientOnly: false,
    serverRequired: true,
    status: 'available'
  },
  {
    id: 'text-diff',
    slug: 'text-diff',
    name: 'Text Diff',
    description: 'Compare two texts and show line changes.',
    category: 'data',
    icon: 'i-lucide-git-compare',
    keywords: ['diff', 'compare', 'text', 'patch', 'unified'],
    route: '/hub/data/text-diff',
    clientOnly: true,
    serverRequired: false,
    status: 'available'
  },
  {
    id: 'json-json5',
    slug: 'json-json5',
    name: 'JSON ↔ JSON5',
    description: 'Convert between JSON and JSON5.',
    category: 'data',
    icon: 'i-lucide-arrow-left-right',
    keywords: ['json', 'json5', 'convert'],
    route: '/hub/data/converters/json-json5',
    clientOnly: false,
    serverRequired: true,
    status: 'available'
  },
  {
    id: 'hash',
    slug: 'hash-generator',
    name: 'Hash Generator',
    description: 'Generate hashes from text input.',
    category: 'crypto',
    icon: 'i-lucide-hash',
    keywords: ['hash', 'sha', 'md5', 'digest'],
    route: '/hub/crypto/hash-generator',
    clientOnly: false,
    serverRequired: true,
    status: 'available'
  },
  {
    id: 'base64',
    slug: 'base64',
    name: 'Base64 Encoder',
    description: 'Encode and decode Base64.',
    category: 'crypto',
    icon: 'i-lucide-binary',
    keywords: ['base64', 'encode', 'decode'],
    route: '/hub/crypto/base64',
    clientOnly: true,
    serverRequired: false,
    status: 'available'
  },
  {
    id: 'hex',
    slug: 'hex',
    name: 'Hex Encoder',
    description: 'Encode and decode hex values.',
    category: 'crypto',
    icon: 'i-lucide-hexagon',
    keywords: ['hex', 'encode', 'decode'],
    route: '/hub/crypto/hex',
    clientOnly: true,
    serverRequired: false,
    status: 'available'
  },
  {
    id: 'uuid',
    slug: 'uuid',
    name: 'UUID Generator',
    description: 'Generate UUID values.',
    category: 'crypto',
    icon: 'i-lucide-fingerprint',
    keywords: ['uuid', 'guid', 'random', 'id'],
    route: '/hub/crypto/uuid',
    clientOnly: true,
    serverRequired: false,
    status: 'available'
  },
  {
    id: 'random-string',
    slug: 'random-string',
    name: 'Random String Generator',
    description: 'Generate random strings.',
    category: 'crypto',
    icon: 'i-lucide-shuffle',
    keywords: ['random', 'string', 'token', 'password'],
    route: '/hub/crypto/random-string',
    clientOnly: true,
    serverRequired: false,
    status: 'available'
  },
  {
    id: 'password-benchmark',
    slug: 'password-benchmark',
    name: 'Password Benchmarker',
    description: 'Compare Argon2id and bcrypt hash timing with safe cost limits.',
    category: 'crypto',
    icon: 'i-lucide-key-round',
    keywords: ['password', 'argon2', 'bcrypt', 'hash', 'benchmark'],
    route: '/hub/crypto/password-benchmark',
    clientOnly: false,
    serverRequired: true,
    status: 'available'
  },
  {
    id: 'color-converter',
    slug: 'converter',
    name: 'Color Converter',
    description: 'Convert colors between formats.',
    category: 'color',
    icon: 'i-lucide-palette',
    keywords: ['color', 'hex', 'rgb', 'hsl', 'oklch'],
    route: '/hub/color/converter',
    clientOnly: true,
    serverRequired: false,
    status: 'available'
  },
  {
    id: 'contrast',
    slug: 'contrast-checker',
    name: 'Contrast Checker',
    description: 'Check contrast for accessibility.',
    category: 'color',
    icon: 'i-lucide-contrast',
    keywords: ['contrast', 'a11y', 'wcag', 'accessibility'],
    route: '/hub/color/contrast-checker',
    clientOnly: true,
    serverRequired: false,
    status: 'available'
  },
  {
    id: 'palette',
    slug: 'palette-generator',
    name: 'Palette Generator',
    description: 'Generate color palettes.',
    category: 'color',
    icon: 'i-lucide-swatch-book',
    keywords: ['palette', 'colors', 'scheme'],
    route: '/hub/color/palette-generator',
    clientOnly: true,
    serverRequired: false,
    status: 'available'
  },
  {
    id: 'color-inspector',
    slug: 'inspector',
    name: 'Color Inspector',
    description: 'Inspect color values and details.',
    category: 'color',
    icon: 'i-lucide-pipette',
    keywords: ['color', 'inspect', 'picker'],
    route: '/hub/color/inspector',
    clientOnly: true,
    serverRequired: false,
    status: 'available'
  },
  {
    id: 'dns',
    slug: 'dns-lookup',
    name: 'DNS Lookup',
    description: 'Look up DNS records for a domain.',
    category: 'network',
    icon: 'i-lucide-globe',
    keywords: ['dns', 'lookup', 'a', 'mx', 'txt'],
    route: '/hub/network/dns-lookup',
    clientOnly: false,
    serverRequired: true,
    status: 'available'
  },
  {
    id: 'headers',
    slug: 'http-headers',
    name: 'HTTP Headers',
    description: 'Inspect HTTP response headers.',
    category: 'network',
    icon: 'i-lucide-list-tree',
    keywords: ['http', 'headers', 'response'],
    route: '/hub/network/http-headers',
    clientOnly: false,
    serverRequired: true,
    status: 'available'
  },
  {
    id: 'url-inspector',
    slug: 'url-inspector',
    name: 'URL Inspector',
    description: 'Inspect and parse URL parts.',
    category: 'network',
    icon: 'i-lucide-link',
    keywords: ['url', 'uri', 'parse', 'inspect'],
    route: '/hub/network/url-inspector',
    clientOnly: true,
    serverRequired: false,
    status: 'available'
  },
  {
    id: 'redirect-checker',
    slug: 'redirect',
    name: 'Redirect Checker',
    description: 'Follow and inspect URL redirects.',
    category: 'network',
    icon: 'i-lucide-route',
    keywords: ['redirect', 'http', 'location'],
    route: '/hub/network/redirect',
    clientOnly: false,
    serverRequired: true,
    status: 'available'
  },
  {
    id: 'og-preview',
    slug: 'og-preview',
    name: 'OpenGraph Previewer',
    description: 'Preview how a page may look when shared on social platforms.',
    category: 'network',
    icon: 'i-lucide-share-2',
    keywords: ['opengraph', 'og', 'twitter', 'meta', 'social', 'preview'],
    route: '/hub/network/og-preview',
    clientOnly: false,
    serverRequired: true,
    status: 'available'
  },
  {
    id: 'image-converter',
    slug: 'converter',
    name: 'Image Converter',
    description: 'Convert images to WebP, AVIF, JPEG, or PNG.',
    category: 'image',
    icon: 'i-lucide-image',
    keywords: ['image', 'webp', 'avif', 'convert', 'compress'],
    route: '/hub/image/converter',
    clientOnly: false,
    serverRequired: true,
    status: 'available'
  },
  {
    id: 'image-resizer',
    slug: 'resizer',
    name: 'Smart Resizer',
    description: 'Resize images with social presets.',
    category: 'image',
    icon: 'i-lucide-scaling',
    keywords: ['image', 'resize', 'thumbnail', 'opengraph', 'favicon'],
    route: '/hub/image/resizer',
    clientOnly: false,
    serverRequired: true,
    status: 'available'
  },
  {
    id: 'image-metadata',
    slug: 'metadata',
    name: 'Metadata Inspector',
    description: 'Inspect image size and strip metadata.',
    category: 'image',
    icon: 'i-lucide-info',
    keywords: ['image', 'exif', 'metadata', 'privacy'],
    route: '/hub/image/metadata',
    clientOnly: false,
    serverRequired: true,
    status: 'available'
  },
  {
    id: 'image-transform',
    slug: 'transform',
    name: 'Orientation & Grayscale',
    description: 'Rotate, mirror, and convert images to grayscale.',
    category: 'image',
    icon: 'i-lucide-flip-horizontal-2',
    keywords: ['image', 'rotate', 'flip', 'grayscale', 'orientation'],
    route: '/hub/image/transform',
    clientOnly: false,
    serverRequired: true,
    status: 'available'
  },
  {
    id: 'semver',
    slug: 'semver',
    name: 'Semver Calculator',
    description: 'Test ranges, sort versions, and bump releases.',
    category: 'dev',
    icon: 'i-lucide-git-branch',
    keywords: ['semver', 'version', 'npm', 'range', 'bump'],
    route: '/hub/dev/semver',
    clientOnly: false,
    serverRequired: true,
    status: 'available'
  },
  {
    id: 'cron',
    slug: 'cron',
    name: 'Cron Visualizer',
    description: 'Validate cron expressions and preview next runs.',
    category: 'dev',
    icon: 'i-lucide-calendar-clock',
    keywords: ['cron', 'schedule', 'crontab', 'timezone'],
    route: '/hub/dev/cron',
    clientOnly: false,
    serverRequired: true,
    status: 'available'
  },
  {
    id: 'tar-explorer',
    slug: 'tar',
    name: 'Tar Explorer',
    description: 'Inspect tar and tar.gz archives in memory.',
    category: 'dev',
    icon: 'i-lucide-folder-archive',
    keywords: ['tar', 'gzip', 'archive', 'tarball'],
    route: '/hub/dev/tar',
    clientOnly: false,
    serverRequired: true,
    status: 'available'
  },
  {
    id: 'transpiler',
    slug: 'transpiler',
    name: 'TS / JSX Transpiler',
    description: 'Transpile TypeScript and JSX to plain JavaScript with Bun.',
    category: 'dev',
    icon: 'i-lucide-code-xml',
    keywords: ['typescript', 'tsx', 'jsx', 'transpile', 'bun'],
    route: '/hub/dev/transpiler',
    clientOnly: false,
    serverRequired: true,
    status: 'available'
  }
]

export function getToolById(id: string): Tool | undefined {
  return tools.find(tool => tool.id === id)
}

export function getToolsByCategory(category: ToolCategory): Tool[] {
  return tools.filter(tool => tool.category === category)
}

export function getAvailableTools(): Tool[] {
  return tools.filter(tool => tool.status === 'available')
}

export function searchTools(query: string): Tool[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return tools
  }

  return tools.filter((tool) => {
    const haystack = [
      tool.name,
      tool.description,
      tool.category,
      ...tool.keywords
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(normalized)
  })
}
