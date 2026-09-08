import * as vue from 'vue'

const domGlobals = new Set(['Comment', 'Text', 'Element', 'Node', 'Document'])

for (const [key, val] of Object.entries(vue)) {
  if (!domGlobals.has(key)) {
    ;(globalThis as any)[key] = val
  }
}
