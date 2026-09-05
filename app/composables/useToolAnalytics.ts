export type ToolAnalyticsEvent
  = | 'tool_open'
    | 'tool_execute'
    | 'tool_error'
    | 'tool_copy'
    | 'tool_download'
    | 'tool_search'

export interface ToolAnalyticsPayload {
  tool: string
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

  function track(event: ToolAnalyticsEvent, payload: ToolAnalyticsPayload) {
    if (import.meta.dev) {
      console.debug('[analytics]', event, payload)
    }

    if (!analytics) {
      return
    }

    analytics.proxy.gtag('event', event, {
      tool_id: payload.tool
    })
  }

  return { track }
}
