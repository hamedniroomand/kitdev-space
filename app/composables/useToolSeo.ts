import { categoryLabels, getToolById } from '~~/shared/utils/tools'

export function useToolSeo(toolId: string) {
  const tool = getToolById(toolId)

  if (!tool) {
    return
  }

  useSeoMeta({
    title: tool.name,
    description: tool.description,
    ogTitle: tool.name,
    ogDescription: tool.description,
    twitterCard: 'summary_large_image'
  })

  useKitDevOgImage({
    title: tool.name,
    description: tool.description,
    eyebrow: categoryLabels[tool.category]
  })
}
