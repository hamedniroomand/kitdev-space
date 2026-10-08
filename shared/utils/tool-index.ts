import type { Tool } from '../types/tools'
import { categoryLabels, tools } from './tools'

export const SITE_ORIGIN = 'https://kitdev.space'

export type ToolRunLocation = 'browser' | 'server' | 'mixed'

export interface ToolIndexEntry {
  slug: string
  name: string
  description: string
  category: string
  url: string
  route: string
  runs: ToolRunLocation
  offline: boolean
}

/** Where the tool runs, from the registry flags. */
export function toolRunLocation(tool: Tool): ToolRunLocation {
  if (tool.serverRequired) {
    return 'server'
  }
  if (tool.clientOnly) {
    return 'browser'
  }
  return 'mixed'
}

/** A browser-only tool works offline after one online visit. */
export function toolWorksOffline(tool: Tool): boolean {
  return tool.clientOnly
}

export function toolAbsoluteUrl(tool: Tool): string {
  return `${SITE_ORIGIN}${tool.route}`
}

export function toolMarkdownPath(tool: Tool): string {
  return `${tool.route}.md`
}

export function toToolIndexEntry(tool: Tool): ToolIndexEntry {
  return {
    slug: tool.slug,
    name: tool.name,
    description: tool.description,
    category: tool.category,
    url: toolAbsoluteUrl(tool),
    route: tool.route,
    runs: toolRunLocation(tool),
    offline: toolWorksOffline(tool),
  }
}

/** Machine-readable list for `/tools.json`. */
export function buildToolsJson(source: readonly Tool[] = tools): {
  version: 1
  site: string
  tools: ToolIndexEntry[]
} {
  return {
    version: 1,
    site: SITE_ORIGIN,
    tools: source.map(toToolIndexEntry),
  }
}

/** Plain-text Markdown for one tool page. */
export function buildToolMarkdown(tool: Tool): string {
  const title = tool.seoTitle ?? tool.name
  const runs = toolRunLocation(tool)
  const offline = toolWorksOffline(tool)
  const category = categoryLabels[tool.category]
  const lines = [
    `# ${title}`,
    '',
    tool.description,
    '',
    `- Category: ${category}`,
    `- URL: ${toolAbsoluteUrl(tool)}`,
    `- Runs: ${runs}`,
    `- Offline: ${offline ? 'yes' : 'no'}`,
    '',
    `Open the tool at ${toolAbsoluteUrl(tool)}.`,
    '',
  ]
  return lines.join('\n')
}

/** Every path that the machine-readable index must publish. */
export function toolIndexPaths(source: readonly Tool[] = tools): {
  toolsJson: string
  llmsTxt: string
  markdown: string[]
} {
  return {
    toolsJson: '/tools.json',
    llmsTxt: '/llms.txt',
    markdown: source.map(toolMarkdownPath),
  }
}

/** Paths to prerender for the tool index. */
export function toolIndexPrerenderRoutes(source: readonly Tool[] = tools): string[] {
  const paths = toolIndexPaths(source)
  return [paths.toolsJson, ...paths.markdown]
}
