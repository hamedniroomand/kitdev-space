import * as Sentry from '@sentry/nuxt'
import { useRuntimeConfig } from '#imports'

/**
 * Browser error monitoring.
 *
 * The site promises that pasted data stays in the browser, so this config
 * sends errors only: no session replay, no personal data, no console
 * breadcrumbs, and no request bodies. The DSN comes from the environment. With
 * no DSN the SDK stays off.
 */
const { dsn, environment } = useRuntimeConfig().public.sentry

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  tunnel: '/tunnel',
  ignoreErrors: [
    'ResizeObserver loop',
    'Failed to fetch',
    'Load failed',
    'NetworkError',
  ],
  beforeBreadcrumb(breadcrumb) {
    return breadcrumb.category === 'console' ? null : breadcrumb
  },
  beforeSend(event) {
    if (event.request) {
      delete event.request.data
      delete event.request.cookies
    }
    return event
  },
})
