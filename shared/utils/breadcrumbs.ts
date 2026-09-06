import type { Tool, ToolCategory } from '../types/tools'
import { categoryLabels } from './tools'

export interface BreadcrumbCrumb {
  label: string
  to?: string
}

export function hubCategoryPath(category: ToolCategory): string {
  return `/hub/${category}`
}

export function buildHubBreadcrumbs(crumbs: BreadcrumbCrumb[]): BreadcrumbCrumb[] {
  return [
    { label: 'Home', to: '/' },
    { label: 'Hub', to: '/hub' },
    ...crumbs.map(crumb => ({
      label: crumb.label,
      ...(crumb.to ? { to: crumb.to } : {}),
    })),
  ]
}

export function buildToolBreadcrumbs(tool: Tool): BreadcrumbCrumb[] {
  return buildHubBreadcrumbs([
    {
      label: categoryLabels[tool.category],
      to: hubCategoryPath(tool.category),
    },
    {
      label: tool.name,
    },
  ])
}

export function buildCategoryBreadcrumbs(category: ToolCategory): BreadcrumbCrumb[] {
  return buildHubBreadcrumbs([
    {
      label: categoryLabels[category],
    },
  ])
}
