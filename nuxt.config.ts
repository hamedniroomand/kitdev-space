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
  '/about',
  '/hub',
  ...hubCategoryRoutes,
  ...tools.map(tool => tool.route),
  ...Object.keys(legacyRedirects),
  '/sitemap.xml',
  '/robots.txt',
  '/llms.txt'
]

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
    '@nuxt/image',
    '@nuxt/scripts',
    '@nuxtjs/seo',
    '@vueuse/nuxt',
    'nuxt-llms',
    '@vercel/speed-insights',
    '@vercel/analytics'
  ],

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
    preference: 'light'
  },

  runtimeConfig: {
    public: {
      googleAnalyticsId
    }
  },

  routeRules: {
    '/**': { prerender: true },
    '/api/**': { prerender: false, robots: false },
    ...legacyRouteRules,
    '/data/**': { redirect: { to: '/hub/data/**', statusCode: 301 } },
    '/network/**': { redirect: { to: '/hub/network/**', statusCode: 301 } },
    '/crypto/**': { redirect: { to: '/hub/crypto/**', statusCode: 301 } },
    '/color/**': { redirect: { to: '/hub/color/**', statusCode: 301 } },
    '/image/**': { redirect: { to: '/hub/image/**', statusCode: 301 } },
    '/dev/**': { redirect: { to: '/hub/dev/**', statusCode: 301 } }
  },

  compatibilityDate: '2026-06-30',

  nitro: {
    preset: nitroPreset(),
    prerender: {
      crawlLinks: true,
      routes: prerenderRoutes
    }
  },

  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('codemirror') || id.includes('vue-codemirror6')) {
              return 'codemirror'
            }
          }
        }
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
