import type { Shape, TypeNode } from './shape'
import { fieldName, inferJsonShape } from './shape'
import { jsonToZod } from './zod'

export { jsonToZod } from './zod'

export interface TypeScriptOptions {
  rootName?: string
  declarationType?: 'interface' | 'type'
  exportMode?: 'typescript' | 'zod'
  widenNull?: boolean
  exportModifier?: boolean
  readonlyModifier?: boolean
}

export function jsonToTypeScript(
  value: unknown,
  optionsOrRootName: string | TypeScriptOptions = 'Root',
): string {
  const options: TypeScriptOptions = typeof optionsOrRootName === 'string'
    ? { rootName: optionsOrRootName }
    : optionsOrRootName
  if (options.exportMode === 'zod') {
    return jsonToZod(value, options)
  }
  const rootName = options.rootName?.trim() || 'Root'
  const declarationType = options.declarationType ?? 'interface'
  const widenNull = options.widenNull ?? false
  const exportModifier = options.exportModifier ?? false
  const readonlyModifier = options.readonlyModifier ?? false
  const exportPrefix = exportModifier ? 'export ' : ''

  const { rootTypes, rootShape } = inferJsonShape(value, rootName, { widenNull })

  const emitted = new Set<Shape>()
  const blocks: string[] = []
  function emit(nodes: TypeNode[]): void {
    for (const node of nodes) {
      if (node.kind === 'array') {
        emit(node.items)
      }
      else if (node.kind === 'shape' && !emitted.has(node.shape)) {
        emitted.add(node.shape)
        for (const field of node.shape.fields) {
          emit(field.types)
        }
        const prefix = readonlyModifier ? 'readonly ' : ''
        const lines = node.shape.fields.map(field =>
          `  ${prefix}${fieldName(field.key)}${field.optional ? '?' : ''}: ${render(field.types)}`,
        )
        if (declarationType === 'type') {
          blocks.push(`${exportPrefix}type ${node.shape.name} = {\n${lines.join('\n')}\n}`)
        }
        else {
          blocks.push(`${exportPrefix}interface ${node.shape.name} {\n${lines.join('\n')}\n}`)
        }
      }
    }
  }
  emit(rootTypes)

  if (rootShape) {
    return `${blocks.join('\n\n')}\n`
  }
  const alias = `${exportPrefix}type ${rootName} = ${render(rootTypes)}\n`
  return blocks.length === 0 ? alias : `${blocks.join('\n\n')}\n\n${alias}`
}

function render(nodes: TypeNode[]): string {
  if (nodes.length === 0) {
    return 'unknown'
  }
  return nodes
    .map((node) => {
      if (node.kind === 'primitive') {
        return node.text
      }
      if (node.kind === 'shape') {
        return node.shape.name
      }
      if (node.items.length === 0) {
        return 'unknown[]'
      }
      const inner = render(node.items)
      return node.items.length === 1 && node.items[0]!.kind !== 'array' ? `${inner}[]` : `Array<${inner}>`
    })
    .join(' | ')
}
