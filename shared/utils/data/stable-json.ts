/**
 * Serializes a value with the object keys in sorted order at every level, so
 * two objects with the same content give the same text. Arrays keep their
 * order, because the order of an array is part of its meaning.
 */
export function stableStringify(value: unknown, space?: number | string): string {
  return JSON.stringify(sortKeys(value), null, space)
}

export function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys)
  }
  if (value && typeof value === 'object') {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key])
    }
    return sorted
  }
  return value
}
