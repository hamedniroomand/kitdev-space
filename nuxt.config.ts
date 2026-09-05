import { tools } from './shared/utils/tools'

function nitroPreset(): string {
  return process.env.NITRO_PRESET ?? (process.env.VERCEL ? 'vercel' : 'bun')
}

const googleAnalyticsId = process.env.NUXT_PUBLIC_GOOGLE_ANALYTICS_ID || ''

const categoryRoutes = ['/data', '/crypto', '/color', '/network', '/image', '/dev'] as const

const prerenderRoutes = [
  '/',
  '/about',
  ...categoryRoutes,
  ...tools.map(tool => tool.route),
  '/sitemap.xml',
  '/robots.txt'
]

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/a11y',
    '@nuxt/hints',
    '@nuxt/image',
    '@nuxt/scripts',
    '@nuxtjs/seo',
    '@vueuse/nuxt',
    '@vercel/speed-insights'
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
    preference: 'dark'
  },

  runtimeConfig: {
    public: {
      googleAnalyticsId
    }
  },

  routeRules: {
    '/**': { prerender: true },
    '/api/**': { prerender: false, robots: false }
  },

  compatibilityDate: '2026-06-30',

  nitro: {
    preset: nitroPreset(),
    prerender: {
      crawlLinks: true,
      routes: prerenderRoutes
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

  ogImage: {
    zeroRuntime: true,
    defaults: {
      width: 1200,
      height: 630,
      emojis: false
    }
  },

  scripts: googleAnalyticsId
    ? {
        registry: {
          googleAnalytics: {
            id: googleAnalyticsId,
            trigger: 'onNuxtReady',
            // Deny ads by default. Analytics on for tool usage metrics.
            // Add a consent UI later for EEA if you need stricter defaults.
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
    exclude: ['/api/**']
  }
})
