/**
 * The id of the tool of the current page.
 *
 * `useToolSeo` sets it. The shared composables read it, so an analytics event
 * carries the tool with no work in each page.
 */
export function useCurrentToolId() {
  return useState<string | null>('tool:current-id', () => null)
}
