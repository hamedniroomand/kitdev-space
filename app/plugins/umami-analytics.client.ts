/**
 * Internal traffic and session data for Umami (Nuxt Scripts).
 * Umami tracks the page views itself, also on client-side navigation.
 * @see https://scripts.nuxt.com/scripts/umami-analytics
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const umamiId = String(config.public.scripts?.umamiAnalytics?.websiteId || '')
  if (!umamiId) {
    return
  }

  // Internal traffic. `/?internal=1` marks this browser, `/?internal=0` clears
  // the mark. Umami reads `umami.disabled` before each send and sends nothing
  // from a marked browser.
  const params = useUrlSearchParams('history')
  const disabled = useLocalStorage<string | null>('umami.disabled', null)
  if (params.internal === '1') {
    disabled.value = '1'
  }
  else if (params.internal === '0') {
    disabled.value = null
  }

  // One session property: the color mode preference, from a fixed list.
  const { proxy } = useScriptUmamiAnalytics()
  const colorMode = useColorMode()
  const preference = ['light', 'dark', 'system'].includes(colorMode.preference) ? colorMode.preference : 'system'
  proxy.identify({ color_mode: preference })
})
