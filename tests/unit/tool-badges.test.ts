import { describe, expect, it } from 'vitest'
import { toolRunBadge } from '#shared/utils/tool-badges'
import { tools } from '#shared/utils/tools'

describe('toolRunBadge', () => {
  it('marks browser-only tools as offline-capable', () => {
    const tool = tools.find(entry => entry.clientOnly)!
    expect(toolRunBadge(tool)?.label).toContain('Offline')
  })

  it('marks server tools as online-only', () => {
    const tool = tools.find(entry => entry.serverRequired)!
    expect(toolRunBadge(tool)?.label).toContain('Online')
  })

  it('hides mixed tools in the sidebar by default', () => {
    const tool = tools.find(entry => !entry.clientOnly && !entry.serverRequired)!
    expect(toolRunBadge(tool)).toBeUndefined()
    expect(toolRunBadge(tool, { includeMixed: true })?.label).toContain('Partial offline')
  })
})
