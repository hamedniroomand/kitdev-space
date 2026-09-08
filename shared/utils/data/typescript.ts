// ponytail: names come from the JSON keys (shortest unique path suffix) and structurally identical
// objects share one interface; upgrade to a schema library if users need richer types.

type TypeNode
  = | { kind: 'primitive', text: string }
    | { kind: 'array', items: TypeNode[] }
    | { kind: 'shape', shape: Shape }

interface Field {
  key: string
  optional: boolean
  types: TypeNode[]
}

interface Shape {
  // raw JSON keys from the root down to this object; rootName is the first segment
  path: string[]
  // true when the object came from array items, so the last segment gets singularized
  fromArray: boolean
  fields: Field[]
  signature: string
  name: string
}

export interface TypeScriptOptions {
  rootName?: string
  declarationType?: 'interface' | 'type'
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
  const rootName = options.rootName?.trim() || 'Root'
  const declarationType = options.declarationType ?? 'interface'
  const widenNull = options.widenNull ?? false
  const exportModifier = options.exportModifier ?? false
  const readonlyModifier = options.readonlyModifier ?? false
  const exportPrefix = exportModifier ? 'export ' : ''
  const shapesBySignature = new Map<string, Shape>()

  function typesOf(samples: unknown[], path: string[], fromArray: boolean): TypeNode[] {
    const nodes: TypeNode[] = []
    const seen = new Set<string>()
    const objects: Record<string, unknown>[] = []
    const arrayItems: unknown[] = []
    let sawArray = false

    for (const sample of samples) {
      if (Array.isArray(sample)) {
        sawArray = true
        arrayItems.push(...sample)
      }
      else if (sample !== null && typeof sample === 'object') {
        objects.push(sample as Record<string, unknown>)
      }
      else {
        const text = sample === null
          ? (widenNull ? 'null | unknown' : 'null')
          : primitiveText(sample)
        if (!seen.has(text)) {
          seen.add(text)
          nodes.push({ kind: 'primitive', text })
        }
      }
    }

    if (objects.length > 0) {
      nodes.push({ kind: 'shape', shape: mergeShape(objects, path, fromArray) })
    }
    if (sawArray) {
      nodes.push({ kind: 'array', items: typesOf(arrayItems, path, true) })
    }
    return nodes
  }

  function mergeShape(objects: Record<string, unknown>[], path: string[], fromArray: boolean): Shape {
    const keys = new Set<string>()
    for (const object of objects) {
      for (const key of Object.keys(object)) {
        keys.add(key)
      }
    }

    const fields: Field[] = []
    for (const key of keys) {
      const present = objects.filter(object => Object.hasOwn(object, key))
      fields.push({
        key,
        optional: present.length < objects.length,
        types: typesOf(present.map(object => object[key]), [...path, key], false),
      })
    }

    const signature = `{${fields
      .map(field => `${field.key}${field.optional ? '?' : ''}:${signatureOf(field.types)}`)
      .sort()
      .join(',')}}`
    const existing = shapesBySignature.get(signature)
    if (existing) {
      return existing
    }
    const shape: Shape = { path, fromArray, fields, signature, name: '' }
    shapesBySignature.set(signature, shape)
    return shape
  }

  const rootTypes = typesOf([value], [rootName], false)
  const rootShape = rootTypes.length === 1 && rootTypes[0]!.kind === 'shape' ? rootTypes[0]!.shape : null

  assignNames([...shapesBySignature.values()], rootShape, rootName)

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

function assignNames(shapes: Shape[], rootShape: Shape | null, rootName: string): void {
  const taken = new Set<string>([rootName])
  let pending = shapes.filter(shape => shape !== rootShape)
  if (rootShape) {
    rootShape.name = rootName
  }

  const maxDepth = Math.max(0, ...pending.map(shape => shape.path.length))
  for (let depth = 1; depth <= maxDepth && pending.length > 0; depth += 1) {
    const counts = new Map<string, number>()
    for (const shape of pending) {
      const candidate = candidateName(shape, depth, rootName)
      counts.set(candidate, (counts.get(candidate) ?? 0) + 1)
    }
    pending = pending.filter((shape) => {
      const candidate = candidateName(shape, depth, rootName)
      if (counts.get(candidate) !== 1 || taken.has(candidate)) {
        return true
      }
      shape.name = candidate
      taken.add(candidate)
      return false
    })
  }

  // identical full paths with different shapes (mixed arrays): fall back to a numeric suffix
  for (const shape of pending) {
    const base = candidateName(shape, shape.path.length, rootName)
    let index = 2
    while (taken.has(`${base}${index}`)) {
      index += 1
    }
    shape.name = `${base}${index}`
    taken.add(shape.name)
  }
}

function candidateName(shape: Shape, depth: number, rootName: string): string {
  if (shape.fromArray && shape.path.length === 1) {
    return `${rootName}Item`
  }
  const segments = shape.path.slice(-depth).map(pascalCase)
  if (shape.fromArray) {
    segments[segments.length - 1] = singularize(segments[segments.length - 1]!)
  }
  return segments.join('')
}

function signatureOf(nodes: TypeNode[]): string {
  return nodes
    .map((node) => {
      if (node.kind === 'primitive') {
        return node.text
      }
      if (node.kind === 'array') {
        return `Array<${signatureOf(node.items)}>`
      }
      return node.shape.signature
    })
    .sort()
    .join('|')
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

function primitiveText(value: unknown): string {
  switch (typeof value) {
    case 'string':
      return 'string'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    default:
      return 'unknown'
  }
}

function fieldName(key: string): string {
  return /^[a-z_$][\w$]*$/i.test(key) ? key : `'${key.replace(/'/g, '\\\'')}'`
}

function pascalCase(value: string): string {
  const parts = value.split(/[^A-Z0-9]+/i).filter(Boolean)
  if (parts.length === 0) {
    return 'Field'
  }
  const name = parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('')
  return /^\d/.test(name) ? `_${name}` : name
}

function singularize(value: string): string {
  if (/[^aeiou]ies$/i.test(value)) {
    return value.replace(/ies$/i, 'y')
  }
  if (/(?:x|ch|sh|ss)es$/i.test(value)) {
    return value.replace(/es$/i, '')
  }
  if (/uses$/i.test(value)) {
    return value.replace(/es$/i, '')
  }
  if (/(?:ss|us|is)$/i.test(value)) {
    return value
  }
  return value.replace(/s$/i, '')
}
