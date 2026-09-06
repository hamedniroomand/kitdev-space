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
    description: 'Format, minify, and validate JSON.',
    category: 'data',
    icon: 'i-lucide-braces',
    keywords: ['json', 'format', 'pretty', 'beautify', 'minify', 'validate', 'lint', 'compress'],
    route: '/hub/data/json-formatter',
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
    id: 'lorem',
    slug: 'lorem',
    name: 'Lorem Ipsum & Mock Data',
    description: 'Generate placeholder paragraphs, words, or fake user profile JSON.',
    category: 'data',
    icon: 'i-lucide-text',
    keywords: ['lorem', 'ipsum', 'mock', 'fake', 'placeholder', 'users'],
    route: '/hub/data/lorem',
    clientOnly: true,
    serverRequired: false,
    status: 'available'
  },
  {
    id: 'markdown-studio',
    slug: 'markdown-studio',
    name: 'Markdown Live Studio',
    description: 'Write markdown with a real-time HTML preview and text metrics.',
    category: 'data',
    icon: 'i-lucide-file-text',
    keywords: ['markdown', 'md', 'gfm', 'html', 'preview', 'editor', 'live', 'word count'],
    route: '/hub/data/markdown-studio',
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
    id: 'csv-json',
    slug: 'csv-json',
    name: 'CSV ↔ JSON / SQL',
    description: 'Convert CSV to JSON or SQL INSERT statements. Convert JSON arrays back to CSV.',
    category: 'data',
    icon: 'i-lucide-table',
    keywords: ['csv', 'json', 'sql', 'insert', 'delimiter', 'tsv', 'convert'],
    route: '/hub/data/converters/csv-json',
    clientOnly: true,
    serverRequired: false,
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
    name: 'UUID & ID Generator',
    description: 'Generate UUIDv4, UUIDv7, ULID, and NanoID values.',
    category: 'crypto',
    icon: 'i-lucide-fingerprint',
    keywords: ['uuid', 'guid', 'random', 'id', 'uuidv7', 'ulid', 'nanoid'],
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
    id: 'jwt',
    slug: 'jwt',
    name: 'JWT Debugger',
    description: 'Decode JWT header and payload. Verify HS256 signatures in the browser.',
    category: 'crypto',
    icon: 'i-lucide-shield-check',
    keywords: ['jwt', 'token', 'decode', 'hmac', 'hs256', 'exp'],
    route: '/hub/crypto/jwt',
    clientOnly: true,
    serverRequired: false,
    status: 'available'
  },
  {
    id: 'passphrase',
    slug: 'passphrase',
    name: 'Passphrase Generator',
    description: 'Generate Diceware passphrases with the EFF large word list.',
    category: 'crypto',
    icon: 'i-lucide-dices',
    keywords: ['diceware', 'passphrase', 'password', 'eff', 'words'],
    route: '/hub/crypto/passphrase',
    clientOnly: true,
    serverRequired: false,
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
    id: 'gradient-studio',
    slug: 'gradient-studio',
    name: 'CSS Gradient Studio',
    description: 'Create linear and radial CSS gradients with contrast checks.',
    category: 'color',
    icon: 'i-lucide-blend',
    keywords: ['css', 'gradient', 'linear', 'radial', 'color', 'stops', 'contrast'],
    route: '/hub/color/gradient-studio',
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
    id: 'email-health',
    slug: 'email-health',
    name: 'Email Health Inspector',
    description: 'Inspect SPF, DKIM selectors, and MX routing for a domain.',
    category: 'network',
    icon: 'i-lucide-mail-check',
    keywords: ['email', 'spf', 'dkim', 'mx', 'dns', 'health'],
    route: '/hub/network/email-health',
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
    id: 'svg-converter',
    slug: 'svg-converter',
    name: 'SVG to PNG / WebP',
    description: 'Convert SVG code or files to PNG or WebP at 1x, 2x, and 4x.',
    category: 'image',
    icon: 'i-lucide-vector-square',
    keywords: ['svg', 'png', 'webp', 'rasterize', 'convert', 'scale'],
    route: '/hub/image/svg-converter',
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
  },
  {
    id: 'case-converter',
    slug: 'case-converter',
    name: 'Case and Slug Converter',
    description: 'Convert text into camelCase, PascalCase, snake_case, kebab-case, and URL slugs.',
    category: 'dev',
    icon: 'i-lucide-case-sensitive',
    keywords: ['case', 'slug', 'camelcase', 'pascalcase', 'snakecase', 'kebabcase'],
    route: '/hub/dev/case-converter',
    clientOnly: true,
    serverRequired: false,
    status: 'available'
  },
  {
    id: 'timestamp',
    slug: 'timestamp',
    name: 'Timestamp Studio',
    description: 'Convert Unix timestamps to ISO 8601 strings and relative time descriptions.',
    category: 'dev',
    icon: 'i-lucide-clock',
    keywords: ['timestamp', 'date', 'unix', 'epoch', 'iso8601', 'time'],
    route: '/hub/dev/timestamp',
    clientOnly: true,
    serverRequired: false,
    status: 'available'
  },
  {
    id: 'css-units',
    slug: 'css-units',
    name: 'CSS Unit Converter',
    description: 'Convert values between px, rem, em, vw, and vh.',
    category: 'dev',
    icon: 'i-lucide-ruler',
    keywords: ['css', 'units', 'px', 'rem', 'em', 'vw', 'vh', 'convert'],
    route: '/hub/dev/css-units',
    clientOnly: true,
    serverRequired: false,
    status: 'available'
  },
  {
    id: 'html-url-codec',
    slug: 'html-url-codec',
    name: 'HTML & URL Codec',
    description: 'Encode and decode HTML entities and URL strings.',
    category: 'dev',
    icon: 'i-lucide-file-code',
    keywords: ['html', 'url', 'encode', 'decode', 'entities', 'uri'],
    route: '/hub/dev/html-url-codec',
    clientOnly: true,
    serverRequired: false,
    status: 'available'
  },
  {
    id: 'svg-component',
    slug: 'svg-component',
    name: 'SVG to Component',
    description: 'Convert SVG markup into a React JSX or Vue 3 component.',
    category: 'dev',
    icon: 'i-lucide-component',
    keywords: ['svg', 'react', 'vue', 'jsx', 'component'],
    route: '/hub/dev/svg-component',
    clientOnly: true,
    serverRequired: false,
    status: 'available'
  },
  {
    id: 'qr-code',
    slug: 'qr-code',
    name: 'QR Code Studio',
    description: 'Generate SVG QR codes for URLs, text, and Wi-Fi networks.',
    category: 'dev',
    icon: 'i-lucide-qr-code',
    keywords: ['qr', 'qrcode', 'wifi', 'svg', 'barcode'],
    route: '/hub/dev/qr-code',
    clientOnly: true,
    serverRequired: false,
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
