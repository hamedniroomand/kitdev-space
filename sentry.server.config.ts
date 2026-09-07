import process from 'node:process'
import * as Sentry from '@sentry/nuxt'

/**
 * Server error monitoring for the API routes.
 *
 * A request body holds the input of a user, so it is removed from every
 * event, together with cookies, the other headers, and the client address.
 * The DSN comes from the environment. With no DSN the SDK stays off.
 */
const dsn = process.env.NUXT_PUBLIC_SENTRY_DSN || ''

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeSend(event) {
    if (event.request) {
      delete event.request.data
      delete event.request.cookies
      if (event.request.headers) {
        event.request.headers = { 'user-agent': event.request.headers['user-agent'] ?? '' }
      }
    }
    delete event.user
    return event
  },
})
