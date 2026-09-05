import type { Tool, ToolCategory } from '../../app/types/tools'

export const categoryLabels: Record<ToolCategory, string> = {
  data: 'Data Lab',
  crypto: 'Crypto Lab',
  color: 'Color Lab',
  network: 'Network Lab'
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
    route: '/data/json-formatter',
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
    route: '/data/json-validator',
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
    route: '/data/json-minifier',
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
    route: '/data/json-to-typescript',
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
    route: '/data/converters/json-yaml',
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
    route: '/data/converters/json-toml',
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
    route: '/data/converters/json-xml',
    clientOnly: false,
    serverRequired: true,
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
    route: '/data/converters/json-json5',
    clientOnly: false,
    serverRequired: true,
    status: 'available'
  },
  {
    id: 'hash',
    slug: 'hash',
    name: 'Hash Generator',
    description: 'Generate hashes from text input.',
    category: 'crypto',
    icon: 'i-lucide-hash',
    keywords: ['hash', 'sha', 'md5', 'digest'],
    route: '/crypto/hash',
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
    route: '/crypto/base64',
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
    route: '/crypto/hex',
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
    route: '/crypto/uuid',
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
    route: '/crypto/random-string',
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
    route: '/color/converter',
    clientOnly: true,
    serverRequired: false,
    status: 'available'
  },
  {
    id: 'contrast',
    slug: 'contrast',
    name: 'Contrast Checker',
    description: 'Check contrast for accessibility.',
    category: 'color',
    icon: 'i-lucide-contrast',
    keywords: ['contrast', 'a11y', 'wcag', 'accessibility'],
    route: '/color/contrast',
    clientOnly: true,
    serverRequired: false,
    status: 'available'
  },
  {
    id: 'palette',
    slug: 'palette',
    name: 'Palette Generator',
    description: 'Generate color palettes.',
    category: 'color',
    icon: 'i-lucide-swatch-book',
    keywords: ['palette', 'colors', 'scheme'],
    route: '/color/palette',
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
    route: '/color/inspector',
    clientOnly: true,
    serverRequired: false,
    status: 'available'
  },
  {
    id: 'dns',
    slug: 'dns',
    name: 'DNS Lookup',
    description: 'Look up DNS records for a domain.',
    category: 'network',
    icon: 'i-lucide-globe',
    keywords: ['dns', 'lookup', 'a', 'mx', 'txt'],
    route: '/network/dns',
    clientOnly: false,
    serverRequired: true,
    status: 'available'
  },
  {
    id: 'headers',
    slug: 'headers',
    name: 'HTTP Headers',
    description: 'Inspect HTTP response headers.',
    category: 'network',
    icon: 'i-lucide-list-tree',
    keywords: ['http', 'headers', 'response'],
    route: '/network/headers',
    clientOnly: false,
    serverRequired: true,
    status: 'coming-soon'
  },
  {
    id: 'url-inspector',
    slug: 'url',
    name: 'URL Inspector',
    description: 'Inspect and parse URL parts.',
    category: 'network',
    icon: 'i-lucide-link',
    keywords: ['url', 'uri', 'parse', 'inspect'],
    route: '/network/url',
    clientOnly: false,
    serverRequired: true,
    status: 'coming-soon'
  },
  {
    id: 'redirect-checker',
    slug: 'redirect',
    name: 'Redirect Checker',
    description: 'Follow and inspect URL redirects.',
    category: 'network',
    icon: 'i-lucide-route',
    keywords: ['redirect', 'http', 'location'],
    route: '/network/redirect',
    clientOnly: false,
    serverRequired: true,
    status: 'coming-soon'
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
