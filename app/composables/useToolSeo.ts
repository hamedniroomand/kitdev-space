import { categoryLabels, getToolById } from '#shared/utils/tools'
import { buildToolBreadcrumbs } from '#shared/utils/breadcrumbs'

export function useToolSeo(toolId: string) {
  const tool = getToolById(toolId)

  if (!tool) {
    return {
      breadcrumbs: computed(() => [])
    }
  }

  const title = tool.seoTitle ?? tool.name
  const breadcrumbs = computed(() => buildToolBreadcrumbs(tool))
  provide('toolBreadcrumbs', breadcrumbs)
  // `RelatedTools` reads this to suggest other tools in the same category.
  provide('currentTool', computed(() => tool))

  // The shared composables read this to name the tool of an analytics event.
  const currentToolId = useCurrentToolId()
  currentToolId.value = tool.id

  const { track } = useToolAnalytics()

  onMounted(() => {
    track('tool_open', { tool: tool.id })

    try {
      const { recordRecent } = useToolPreferences()
      recordRecent(tool.id)
    } catch {
      // Ignore storage errors
    }
  })

  useSeoMeta({
    title,
    description: tool.description,
    ogTitle: title,
    ogDescription: tool.description,
    ogType: 'website'
  })

  useKitDevOgImage({
    title,
    description: tool.description,
    eyebrow: categoryLabels[tool.category]
  })

  useSchemaOrg([
    defineBreadcrumb({
      itemListElement: [
        { name: 'Home', item: '/' },
        { name: 'Hub', item: '/hub' },
        { name: categoryLabels[tool.category], item: `/hub/${tool.category}` },
        { name: tool.name, item: tool.route }
      ]
    }),
    defineSoftwareApp({
      name: title,
      description: tool.description,
      url: tool.route,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any',
      offers: {
        price: 0,
        priceCurrency: 'USD'
      }
    })
  ])

  return {
    breadcrumbs
  }
}
