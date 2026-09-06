import { legacyRedirects } from './shared/utils/redirects'
import { categoryLabels, tools } from './shared/utils/tools'

function nitroPreset(): string {
  return process.env.NITRO_PRESET ?? (process.env.VERCEL ? 'vercel' : 'bun')
}

const googleAnalyticsId = process.env.NUXT_PUBLIC_GOOGLE_ANALYTICS_ID || ''

const legacyRouteRules: Record<string, { redirect: { to: string, statusCode: number } }> = {}
for (const [oldPath, newPath] of Object.entries(legacyRedirects)) {
  legacyRouteRules[oldPath] = { redirect: { to: newPath, statusCode: 301 } }
  legacyRouteRules[`${oldPath}/`] = { redirect: { to: newPath, statusCode: 301 } }
}

const hubCategoryRoutes = Object.keys(categoryLabels).map(category => `/hub/${category}`)

const prerenderRoutes = [
  '/',
  '/hub',
  ...hubCategoryRoutes,
  ...tools.map(tool => tool.route),
  ...Object.keys(legacyRedirects),
  '/sitemap.xml',
  '/robots.txt',
  '/llms.txt'
]

/**
 * Content Security Policy.
 *
 * Every page is prerendered to static HTML on the CDN, so a per-request nonce
 * is not possible and inline scripts need `'unsafe-inline'`. The policy still
 * blocks plugins, framing, base-tag rewrites, and unexpected network egress.
 * `'wasm-unsafe-eval'` lets sql.js compile its WebAssembly module.
 */
const contentSecurityPolicy = [
  'default-src \'self\'',
  'base-uri \'self\'',
  'object-src \'none\'',
  'frame-ancestors \'none\'',
  'form-action \'self\'',
  'img-src \'self\' data: blob: https:',
  'font-src \'self\' data: https://fonts.gstatic.com',
  'style-src \'self\' \'unsafe-inline\'',
  'script-src \'self\' \'unsafe-inline\' \'wasm-unsafe-eval\' https://www.googletagmanager.com https://va.vercel-scripts.com',
  'connect-src \'self\' https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://va.vercel-scripts.com',
  'worker-src \'self\' blob:',
  'manifest-src \'self\'',
  'upgrade-insecure-requests'
].join('; ')

const securityHeaders = {
  'Content-Security-Policy': contentSecurityPolicy,
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
}

/**
 * API responses carry tool output, which includes bytes fetched from a remote
 * host. They must never render as a document or get sniffed into one.
 */
const apiSecurityHeaders = {
  'Content-Security-Policy': 'default-src \'none\'; sandbox',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cache-Control': 'no-store'
}

const llmsSections = Object.entries(categoryLabels).map(([category, label]) => ({
  title: label,
  description: `Tools for ${category} operations.`,
  links: tools
    .filter(tool => tool.category === category)
    .map(tool => ({
      title: tool.name,
      description: tool.description,
      href: tool.route
    }))
}))

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/a11y',
    // '@nuxt/hints',
    '@nuxt/scripts',
    '@nuxtjs/seo',
    '@vueuse/nuxt',
    'nuxt-llms',
    '@vercel/speed-insights',
    '@vercel/analytics'
  ],

  components: [{ path: '~/components', pathPrefix: false }],

  devtools: {
    enabled: process.env.NUXT_DEVTOOLS !== 'false'
  },

  css: ['~/assets/css/main.css'],

  site: {
    url: 'https://kitdev.space',
    name: 'KitDev Space',
    description: 'Developer tools for people who build things.',
    defaultLocale: 'en'
  },

  colorMode: {
    preference: 'dark'
  },

  runtimeConfig: {
    public: {
      googleAnalyticsId
    }
  },

  routeRules: {
    '/**': { prerender: true, headers: securityHeaders },
    '/api/**': { prerender: false, robots: false, headers: apiSecurityHeaders },
    ...legacyRouteRules,
    '/data/**': { redirect: { to: '/hub/data/**', statusCode: 301 } },
    '/network/**': { redirect: { to: '/hub/network/**', statusCode: 301 } },
    '/crypto/**': { redirect: { to: '/hub/crypto/**', statusCode: 301 } },
    '/color/**': { redirect: { to: '/hub/color/**', statusCode: 301 } },
    '/image/**': { redirect: { to: '/hub/image/**', statusCode: 301 } },
    '/dev/**': { redirect: { to: '/hub/dev/**', statusCode: 301 } }
  },

  experimental: {
    payloadExtraction: 'client',
    defaults: {
      nuxtLink: {
        // Both flags are needed: Nuxt merges this object with its default
        // `{ visibility: true }`, so `interaction` alone keeps visibility on.
        prefetchOn: { visibility: false, interaction: true }
      }
    },
    viewTransition: true
  },

  compatibilityDate: '2026-06-30',

  nitro: {
    preset: nitroPreset(),
    prerender: {
      crawlLinks: true,
      routes: prerenderRoutes
    },
    vercel: {
      functions: {
        runtime: 'bun1.x'
      }
    }
  },

  vite: {
    optimizeDeps: {
      include: ['@codemirror/lang-css', '@codemirror/lang-html', '@codemirror/lang-javascript', '@codemirror/lang-json', '@codemirror/lang-markdown', '@codemirror/lang-sql', '@codemirror/lint', '@codemirror/theme-one-dark', '@codemirror/view', 'sql-formatter', 'sql.js', 'vue-codemirror6', '@unhead/schema-org/vue', '@codemirror/commands', '@vue/devtools-core', '@vue/devtools-kit', 'uqr']
    }
    // No manualChunks here. Rollup pulls every static dependency of a manual
    // chunk into it, so a "codemirror" chunk also swallowed Vue and every page
    // had to load the editor. `ToolCodeMirror` loads lazily and splits on its own.
  },

  hooks: {
    // Do not preload the chunks behind a dynamic import. The editor, the docs,
    // and the command palette load on demand, and a preload of every lazy
    // chunk on first paint defeats that.
    'build:manifest': (manifest) => {
      for (const entry of Object.values(manifest)) {
        entry.dynamicImports = []
      }
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  fonts: {
    defaults: {
      weights: [400, 500, 600],
      styles: ['normal'],
      subsets: ['latin'],
      preload: true
    },
    families: [
      {
        name: 'Inter',
        provider: 'google',
        weights: [400, 500, 600],
        styles: ['normal'],
        subsets: ['latin'],
        preload: true
      },
      {
        name: 'JetBrains Mono',
        provider: 'google',
        weights: [400, 500, 600],
        styles: ['normal'],
        subsets: ['latin'],
        preload: false
      }
    ]
  },

  llms: {
    domain: 'https://kitdev.space',
    title: 'KitDev Space',
    description: 'Developer tools for people who build things.',
    notes: [
      'KitDev Space provides tools for developers.',
      'Tools run in the browser or on the server without data persistence.'
    ],
    sections: llmsSections
  },

  ogImage: {
    zeroRuntime: true,
    defaults: {
      width: 1200,
      height: 630,
      emojis: false
    }
  },

  schemaOrg: {
    identity: {
      type: 'Organization',
      name: 'KitDev Space',
      url: 'https://kitdev.space',
      logo: '/apple-touch-icon.png',
      description: 'Developer tools for people who build things.'
    }
  },

  scripts: googleAnalyticsId
    ? {
        registry: {
          googleAnalytics: {
            id: googleAnalyticsId,
            trigger: { idleTimeout: 3500 },
            defaultConsent: {
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              analytics_storage: 'granted'
            }
          }
        }
      }
    : {},

  sitemap: {
    exclude: [
      '/api/**',
      ...Object.keys(legacyRedirects),
      ...Object.keys(legacyRedirects).map(path => `${path}/`),
      '/data/**',
      '/network/**',
      '/crypto/**',
      '/color/**',
      '/image/**',
      '/dev/**'
    ]
  }
})
