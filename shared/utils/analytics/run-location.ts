export type RunLocation = 'browser' | 'server' | 'mixed'

/** Where a tool runs, from its registry flags. A tool with a browser path and a server path is mixed. */
export function runLocationFor(tool: { clientOnly: boolean, serverRequired: boolean }): RunLocation {
  if (tool.clientOnly) {
    return 'browser'
  }
  if (tool.serverRequired) {
    return 'server'
  }
  return 'mixed'
}
