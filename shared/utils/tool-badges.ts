import type { Tool } from '../types/tools'
import { toolRunLocation, toolWorksOffline } from './tool-index'

export interface ToolBadge {
  label: string
  color: 'neutral' | 'warning' | 'success' | 'primary'
  variant: 'subtle'
  size: 'xs'
}

/**
 * Where-work-runs badge, including offline honesty.
 * Mixed tools stay unlabeled in the sidebar (architecture.md). Pass
 * `includeMixed` on the tool page so the page can still say the truth.
 */
export function toolRunBadge(tool: Tool, options: { includeMixed?: boolean } = {}): ToolBadge | undefined {
  const runs = toolRunLocation(tool)
  if (runs === 'browser') {
    return {
      label: toolWorksOffline(tool) ? '🔒 Client · Offline' : '🔒 Client',
      color: 'neutral',
      variant: 'subtle',
      size: 'xs',
    }
  }
  if (runs === 'server') {
    return {
      label: '⚡ Bun · Online',
      color: 'warning',
      variant: 'subtle',
      size: 'xs',
    }
  }
  if (!options.includeMixed) {
    return undefined
  }
  return {
    label: 'Mixed · Partial offline',
    color: 'primary',
    variant: 'subtle',
    size: 'xs',
  }
}
