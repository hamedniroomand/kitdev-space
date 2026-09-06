import type { InputBytesBucket, QueryLengthBucket } from '#shared/utils/analytics/buckets'
import type { ErrorKind } from '#shared/utils/analytics/error-kind'
import type { RunLocation } from '#shared/utils/analytics/run-location'
import { runLocationFor } from '#shared/utils/analytics/run-location'
import { getToolById } from '#shared/utils/tools'

/** The one list of event names. Add an event here and its parameters in `ToolAnalyticsParams`. */
export type ToolAnalyticsEvent
  = | 'tool_open'
    | 'tool_select'
    | 'tool_execute'
    | 'tool_error'
    | 'tool_copy'
    | 'tool_download'
    | 'tool_search'
    | 'search_result'
    | 'tool_input'
    | 'cta_click'

export type SelectSource = 'sidebar' | 'palette' | 'hub_card' | 'category_page' | 'related' | 'home'
export type InputMethod = 'paste' | 'type' | 'file' | 'drop' | 'sample' | 'url'
export type CopyTarget = 'result' | 'snippet' | 'field'
export type Cta = 'github' | 'article' | 'landing'

/**
 * The parameters of each event. Every value comes from a fixed list in code or
 * is a size bucket. `option` is the enumerated choice of a tool, such as a hash
 * algorithm or a target format, and the caller must pass a value from its own
 * fixed list.
 */
export interface ToolAnalyticsParams {
  tool_open: Record<never, never>
  tool_select: { source: SelectSource }
  tool_execute: {
    duration_ms: number
    input_bytes_bucket: InputBytesBucket
    run_location?: Exclude<RunLocation, 'mixed'>
    option?: string
  }
  tool_error: { error_kind: ErrorKind }
  tool_copy: { target: CopyTarget }
  tool_download: { file_format: string }
  tool_search: Record<never, never>
  search_result: { query_length: QueryLengthBucket }
  tool_input: { method: InputMethod }
  cta_click: { cta: Cta }
}

/** Events that describe the site, not a tool. They send no `tool_id`. */
const SITE_EVENTS = new Set<ToolAnalyticsEvent>(['cta_click'])

export type ToolAnalyticsPayload<E extends ToolAnalyticsEvent> = ToolAnalyticsParams[E] & {
  /** The tool the event is about. Defaults to the open tool. */
  tool?: string
}

/**
 * Privacy-safe analytics.
 *
 * An event carries a tool id, the registry facts about that tool, and the
 * parameters of `ToolAnalyticsParams`. It never carries input, output, a file
 * name, a URL, a search query, or an error message.
 * @see https://scripts.nuxt.com/scripts/google-analytics
 */
export function useToolAnalytics() {
  const config = useRuntimeConfig()
  const gaId = String(config.public.googleAnalyticsId || '')
  const analytics = gaId ? useScriptGoogleAnalytics() : null

  const currentToolId = useCurrentToolId()

  function track<E extends ToolAnalyticsEvent>(event: E, payload: ToolAnalyticsPayload<E> = {} as ToolAnalyticsPayload<E>) {
    const { tool: toolOverride, ...params } = payload as ToolAnalyticsPayload<E> & Record<string, unknown>
    // A site event describes the site, so it carries no tool, even on a tool page.
    const tool = SITE_EVENTS.has(event) ? undefined : (toolOverride ?? currentToolId.value ?? undefined)

    // A tool event with no tool cannot be read, so do not send it.
    if (!tool && !SITE_EVENTS.has(event)) {
      return
    }

    const info = tool ? getToolById(tool) : undefined
    const data: Record<string, unknown> = {
      ...(tool ? { tool_id: tool } : {}),
      ...(info
        ? {
            tool_category: info.category,
            run_location: runLocationFor(info),
            ...(info.variantOf ? { tool_variant_of: info.variantOf } : {}),
          }
        : {}),
      ...params,
    }

    if (import.meta.dev) {
      // eslint-disable-next-line no-console -- a dev-only trace of the analytics events
      console.debug('[analytics]', event, data)
    }

    if (!analytics) {
      return
    }

    analytics.proxy.gtag('event', event, data)
  }

  return { track }
}
