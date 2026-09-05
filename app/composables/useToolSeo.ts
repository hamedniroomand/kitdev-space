import { getToolById } from '~~/shared/utils/tools'

export function useToolSeo(toolId: string) {
  const tool = getToolById(toolId)

  if (!tool) {
    return
  }

  useSeoMeta({
    title: tool.name,
    description: tool.description,
    ogTitle: tool.name,
    ogDescription: tool.description
  })
}
