// ponytail: names come from the JSON keys (shortest unique path suffix) and structurally identical
// objects share one shape.

export type TypeNode
  = | { kind: 'primitive', text: string }
    | { kind: 'array', items: TypeNode[] }
    | { kind: 'shape', shape: Shape }

export interface Field {
  key: string
  optional: boolean
  types: TypeNode[]
}

export interface Shape {
  path: string[]
  fromArray: boolean
  fields: Field[]
  signature: string
  name: string
}

export interface InferShapeOptions {
  widenNull?: boolean
}

export interface InferredJsonShape {
  rootTypes: TypeNode[]
  rootShape: Shape | null
  shapes: Shape[]
}

export function inferJsonShape(
  value: unknown,
  rootName: string,
  options: InferShapeOptions = {},
): InferredJsonShape {
  const widenNull = options.widenNull ?? false
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

  return {
    rootTypes,
    rootShape,
    shapes: [...shapesBySignature.values()],
  }
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

export function primitiveText(value: unknown): string {
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

export function fieldName(key: string): string {
  return /^[a-z_$][\w$]*$/i.test(key) ? key : `'${key.replace(/'/g, '\\\'')}'`
}

export function pascalCase(value: string): string {
  const parts = value.split(/[^A-Z0-9]+/i).filter(Boolean)
  if (parts.length === 0) {
    return 'Field'
  }
  const name = parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('')
  return /^\d/.test(name) ? `_${name}` : name
}

export function toCamelCase(value: string): string {
  if (!value) {
    return 'value'
  }
  return value.charAt(0).toLowerCase() + value.slice(1)
}

export function singularize(value: string): string {
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
