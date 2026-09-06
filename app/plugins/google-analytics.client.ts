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

  // Internal traffic. `/?internal=1` marks this browser, `/?internal=0` clears
  // the mark. A marked browser sends `traffic_type: internal` on every event,
  // which the GA4 internal traffic filter drops.
  const params = useUrlSearchParams('history')
  const internal = useLocalStorage('kitdev:internal', '0')
  if (params.internal === '1' || params.internal === '0') {
    internal.value = String(params.internal)
  }
  if (internal.value === '1') {
    proxy.gtag('set', { traffic_type: 'internal' })
  }

  // One user property: the color mode preference, from a fixed list.
  const colorMode = useColorMode()
  const preference = ['light', 'dark', 'system'].includes(colorMode.preference) ? colorMode.preference : 'system'
  proxy.gtag('set', { user_properties: { color_mode: preference } })

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
