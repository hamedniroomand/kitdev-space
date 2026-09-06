import {
  categoryLabels,
  getAvailableTools,
  getPrimaryTools,
  getToolById,
  getToolsByCategory,
  tools,
} from '#shared/utils/tools'

export function useTools() {
  return {
    tools,
    categoryLabels,
    getToolById,
    getToolsByCategory,
    getAvailableTools,
    getPrimaryTools,
  }
}
