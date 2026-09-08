export interface JsonTreeNode {
  id: string
  path: string
  key?: string | number
  value: unknown
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'
  depth: number
  hasChildren: boolean
  childCount: number
}

export function buildJsonPath(parentPath: string, key: string | number): string {
  if (typeof key === 'number') {
    return `${parentPath}[${key}]`
  }
  if (/^[a-z_$][\w$]*$/i.test(key)) {
    return parentPath === '$' ? `$.${key}` : `${parentPath}.${key}`
  }
  return `${parentPath}['${key.replace(/'/g, '\\\'')}']`
}

export function flattenJsonTree(
  data: unknown,
  collapsedState: Record<string, boolean> = {},
): JsonTreeNode[] {
  const nodes: JsonTreeNode[] = []

  function walk(
    val: unknown,
    path: string,
    key: string | number | undefined,
    depth: number,
  ) {
    const isArr = Array.isArray(val)
    const isObj = val !== null && typeof val === 'object' && !isArr
    let type: JsonTreeNode['type'] = 'null'
    if (val === null) {
      type = 'null'
    }
    else if (isArr) {
      type = 'array'
    }
    else if (isObj) {
      type = 'object'
    }
    else if (typeof val === 'string') {
      type = 'string'
    }
    else if (typeof val === 'number') {
      type = 'number'
    }
    else if (typeof val === 'boolean') {
      type = 'boolean'
    }

    const hasChildren = isArr ? val.length > 0 : (isObj ? Object.keys(val as object).length > 0 : false)
    const childCount = isArr ? val.length : (isObj ? Object.keys(val as object).length : 0)
    const isCollapsed = collapsedState[path] ?? (depth >= 2)

    nodes.push({
      id: path,
      path,
      key,
      value: val,
      type,
      depth,
      hasChildren,
      childCount,
    })

    if (hasChildren && !isCollapsed) {
      if (isArr) {
        for (let i = 0; i < (val as unknown[]).length; i++) {
          walk((val as unknown[])[i], buildJsonPath(path, i), i, depth + 1)
        }
      }
      else if (isObj) {
        const keys = Object.keys(val as Record<string, unknown>)
        for (const k of keys) {
          walk((val as Record<string, unknown>)[k], buildJsonPath(path, k), k, depth + 1)
        }
      }
    }
  }

  walk(data, '$', undefined, 0)
  return nodes
}
