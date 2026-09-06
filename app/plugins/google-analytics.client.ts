/**
 * SPA page views for Google Analytics (Nuxt Scripts).
 * Skips the initial page:finish callback because the registry already sends it.
 * @see https://scripts.nuxt.com/scripts/google-analytics
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const gaId = String(config.public.googleAnalyticsId || '')
  if (!gaId) {
    return
  }

  const { proxy } = useScriptGoogleAnalytics()
  const initialPath = useRoute().fullPath
  let initialPageSeen = false
  let previousLocation: string | undefined

  useScriptEventPage(({ title, path }) => {
    const pageLocation = new URL(path, window.location.origin).href

    if (!initialPageSeen && path === initialPath) {
      initialPageSeen = true
      previousLocation = pageLocation
      return
    }

    previousLocation ||= new URL(initialPath, window.location.origin).href
    proxy.gtag('event', 'page_view', {
      page_title: title,
      page_location: pageLocation,
      page_referrer: previousLocation,
    })
    previousLocation = pageLocation
  })
})
