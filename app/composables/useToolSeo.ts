import { categoryLabels, getToolById } from '#shared/utils/tools'
import { buildToolBreadcrumbs } from '#shared/utils/breadcrumbs'

export function useToolSeo(toolId: string) {
  const tool = getToolById(toolId)

  if (!tool) {
    return {
      breadcrumbs: computed(() => [])
    }
  }

  const breadcrumbs = computed(() => buildToolBreadcrumbs(tool))
  provide('toolBreadcrumbs', breadcrumbs)

  onMounted(() => {
    try {
      const { recordRecent } = useToolPreferences()
      recordRecent(tool.id)
    } catch {
      // Ignore storage errors
    }
  })

  useSeoMeta({
    title: tool.name,
    description: tool.description,
    ogTitle: tool.name,
    ogDescription: tool.description,
    ogType: 'website'
  })

  useKitDevOgImage({
    title: tool.name,
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
      name: tool.name,
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
