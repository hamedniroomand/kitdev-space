import type { Shape, TypeNode } from './shape'
import { fieldName, inferJsonShape, toCamelCase } from './shape'

export interface ZodOptions {
  rootName?: string
  widenNull?: boolean
  exportModifier?: boolean
  readonlyModifier?: boolean
}

export function jsonToZod(
  value: unknown,
  optionsOrRootName: string | ZodOptions = 'Root',
): string {
  const options: ZodOptions = typeof optionsOrRootName === 'string'
    ? { rootName: optionsOrRootName }
    : optionsOrRootName
  const rootName = options.rootName?.trim() || 'Root'
  const widenNull = options.widenNull ?? false
  const exportModifier = options.exportModifier ?? false
  const readonlyModifier = options.readonlyModifier ?? false
  const exportPrefix = exportModifier ? 'export ' : ''

  const { rootTypes, rootShape } = inferJsonShape(value, rootName, { widenNull })

  function renderZodType(nodes: TypeNode[]): string {
    if (nodes.length === 0) {
      return 'z.unknown()'
    }
    if (nodes.length === 1) {
      const node = nodes[0]!
      if (node.kind === 'primitive') {
        if (node.text === 'string') {
          return 'z.string()'
        }
        if (node.text === 'number') {
          return 'z.number()'
        }
        if (node.text === 'boolean') {
          return 'z.boolean()'
        }
        if (node.text === 'null') {
          return 'z.null()'
        }
        if (node.text === 'null | unknown') {
          return 'z.null().or(z.unknown())'
        }
        return 'z.unknown()'
      }
      if (node.kind === 'shape') {
        return `${toCamelCase(node.shape.name)}Schema`
      }
      return `z.array(${renderZodType(node.items)})`
    }
    const renderedNodes = nodes.map(node => renderZodType([node]))
    return `z.union([${renderedNodes.join(', ')}])`
  }

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
        const schema = `${toCamelCase(node.shape.name)}Schema`
        const lines = node.shape.fields.map((field) => {
          let fieldType = renderZodType(field.types)
          if (field.optional) {
            fieldType = `${fieldType}.optional()`
          }
          if (readonlyModifier) {
            fieldType = `${fieldType}.readonly()`
          }
          return `  ${fieldName(field.key)}: ${fieldType},`
        })
        const objectBody = lines.length === 0 ? '{}' : `{\n${lines.join('\n')}\n}`
        let schemaDef = `z.object(${objectBody})`
        if (readonlyModifier) {
          schemaDef = `${schemaDef}.readonly()`
        }
        blocks.push(
          `${exportPrefix}const ${schema} = ${schemaDef}\n\n${exportPrefix}type ${node.shape.name} = z.infer<typeof ${schema}>`,
        )
      }
    }
  }

  emit(rootTypes)

  let rootCode: string
  if (rootShape) {
    rootCode = blocks.join('\n\n')
  }
  else {
    const rootSchemaName = `${toCamelCase(rootName)}Schema`
    let rootZodType = renderZodType(rootTypes)
    if (readonlyModifier) {
      rootZodType = `${rootZodType}.readonly()`
    }
    const rootBlock = `${exportPrefix}const ${rootSchemaName} = ${rootZodType}\n\n${exportPrefix}type ${rootName} = z.infer<typeof ${rootSchemaName}>`
    rootCode = blocks.length === 0 ? rootBlock : `${blocks.join('\n\n')}\n\n${rootBlock}`
  }

  return `import { z } from 'zod'\n\n${rootCode}\n`
}
