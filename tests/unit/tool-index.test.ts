import { describe, expect, it } from 'vitest'
import {
  buildToolMarkdown,
  buildToolsJson,
  toolIndexPaths,
  toolMarkdownPath,
  toolRunLocation,
  toolWorksOffline,
} from '#shared/utils/tool-index'
import { tools } from '#shared/utils/tools'

describe('tool index', () => {
  it('lists every registry tool in tools.json', () => {
    const index = buildToolsJson()
    expect(index.version).toBe(1)
    expect(index.site).toBe('https://kitdev.space')
    expect(index.tools).toHaveLength(tools.length)

    const slugs = new Set(index.tools.map(tool => tool.slug))
    for (const tool of tools) {
      expect(slugs.has(tool.slug), tool.id).toBe(true)
      const entry = index.tools.find(item => item.route === tool.route)
      expect(entry?.name).toBe(tool.name)
      expect(entry?.description).toBe(tool.description)
      expect(entry?.category).toBe(tool.category)
      expect(entry?.url).toBe(`https://kitdev.space${tool.route}`)
      expect(entry?.runs).toBe(toolRunLocation(tool))
      expect(entry?.offline).toBe(toolWorksOffline(tool))
    }
  })

  it('builds markdown for every registry tool', () => {
    for (const tool of tools) {
      const markdown = buildToolMarkdown(tool)
      expect(markdown).toContain(`# ${tool.seoTitle ?? tool.name}`)
      expect(markdown).toContain(tool.description)
      expect(markdown).toContain(`https://kitdev.space${tool.route}`)
      expect(markdown).toContain(`Runs: ${toolRunLocation(tool)}`)
      expect(toolMarkdownPath(tool)).toBe(`${tool.route}.md`)
    }
  })

  it('keeps the published path set in sync with the registry', () => {
    const paths = toolIndexPaths()
    expect(paths.toolsJson).toBe('/tools.json')
    expect(paths.llmsTxt).toBe('/llms.txt')
    expect(paths.markdown).toHaveLength(tools.length)
    expect(new Set(paths.markdown).size).toBe(tools.length)

    for (const tool of tools) {
      expect(paths.markdown).toContain(`${tool.route}.md`)
    }
  })

  it('maps registry flags to run location and offline', () => {
    const client = tools.find(tool => tool.clientOnly)!
    const server = tools.find(tool => tool.serverRequired)!
    const mixed = tools.find(tool => !tool.clientOnly && !tool.serverRequired)!

    expect(toolRunLocation(client)).toBe('browser')
    expect(toolWorksOffline(client)).toBe(true)
    expect(toolRunLocation(server)).toBe('server')
    expect(toolWorksOffline(server)).toBe(false)
    expect(toolRunLocation(mixed)).toBe('mixed')
    expect(toolWorksOffline(mixed)).toBe(false)
  })
})
