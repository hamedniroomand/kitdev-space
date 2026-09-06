// ponytail: mixed arrays and deep nesting use a simple heuristic; upgrade to a schema library if users need richer types.
export function jsonToTypeScript(value: unknown, rootName = 'Root'): string {
  const interfaces: string[] = []
  const usedNames = new Set<string>([rootName])

  function uniqueName(base: string): string {
    if (!usedNames.has(base)) {
      usedNames.add(base)
      return base
    }
    let index = 2
    while (usedNames.has(`${base}${index}`)) {
      index += 1
    }
    const name = `${base}${index}`
    usedNames.add(name)
    return name
  }

  function typeOf(node: unknown, name: string): string {
    if (node === null) {
      return 'null'
    }
    if (Array.isArray(node)) {
      if (node.length === 0) {
        return 'unknown[]'
      }
      const itemTypes = [...new Set(node.map((item, index) =>
        typeOf(item, `${name}Item${index === 0 ? '' : index + 1}`),
      ))]
      if (itemTypes.length === 1) {
        return `${itemTypes[0]}[]`
      }
      return `Array<${itemTypes.join(' | ')}>`
    }
    switch (typeof node) {
      case 'string':
        return 'string'
      case 'number':
        return 'number'
      case 'boolean':
        return 'boolean'
      case 'object': {
        const interfaceName = uniqueName(name)
        const entries = Object.entries(node as Record<string, unknown>)
        const fields = entries.map(([key, child]) => {
          const fieldName = /^[A-Z_]\w*$/i.test(key) ? key : `'${key}'`
          const childName = `${interfaceName}${capitalize(key)}`
          return `  ${fieldName}: ${typeOf(child, childName)}`
        })
        interfaces.push(`interface ${interfaceName} {\n${fields.join('\n')}\n}`)
        return interfaceName
      }
      default:
        return 'unknown'
    }
  }

  const rootType = typeOf(value, rootName)

  if (interfaces.length === 0) {
    return `type ${rootName} = ${rootType}\n`
  }

  if (rootType !== rootName && !interfaces.some(block => block.startsWith(`interface ${rootName}`))) {
    return `${interfaces.join('\n\n')}\n\ntype ${rootName} = ${rootType}\n`
  }

  return `${interfaces.join('\n\n')}\n`
}

function capitalize(value: string): string {
  const clean = value.replace(/[^A-Z0-9]/gi, '')
  if (!clean) {
    return 'Field'
  }
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}
