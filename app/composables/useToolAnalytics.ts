export type ToolAnalyticsEvent
  = | 'tool_open'
    | 'tool_execute'
    | 'tool_error'
    | 'tool_copy'
    | 'tool_download'
    | 'tool_search'

export interface ToolAnalyticsPayload {
  tool?: string
}

/**
 * Privacy-safe tool analytics.
 * Payload may include tool id only. Never send input or output.
 * Sends Google Analytics events through Nuxt Scripts when configured.
 * @see https://scripts.nuxt.com/scripts/google-analytics
 */
export function useToolAnalytics() {
  const config = useRuntimeConfig()
  const gaId = String(config.public.googleAnalyticsId || '')
  const analytics = gaId ? useScriptGoogleAnalytics() : null

  const currentToolId = useCurrentToolId()

  function track(event: ToolAnalyticsEvent, payload: ToolAnalyticsPayload = {}) {
    const tool = payload.tool ?? currentToolId.value

    // An event with no tool cannot be read, so do not send it.
    if (!tool) {
      return
    }

    if (import.meta.dev) {
      // eslint-disable-next-line no-console -- a dev-only trace of the analytics events
      console.debug('[analytics]', event, tool)
    }

    if (!analytics) {
      return
    }

    analytics.proxy.gtag('event', event, {
      tool_id: tool,
    })
  }

  return { track }
}
