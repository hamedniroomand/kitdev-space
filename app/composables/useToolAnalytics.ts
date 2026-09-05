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
 * Privacy-safe analytics stub.
 * Payload may include tool id only. Never send input or output.
 * Plug Umami or Plausible later by replacing track().
 */
export function useToolAnalytics() {
  function track(event: ToolAnalyticsEvent, payload: ToolAnalyticsPayload) {
    if (import.meta.dev) {
      console.debug('[analytics]', event, payload)
    }
  }

  return { track }
}
