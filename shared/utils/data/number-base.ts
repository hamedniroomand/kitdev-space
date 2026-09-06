export type NumberBase = 2 | 8 | 10 | 16

export interface NumberBases {
  binary: string
  octal: string
  decimal: string
  hex: string
}

export function parseNumberToBigInt(value: string, base: NumberBase): bigint {
  const clean = value.trim().toLowerCase()
  if (!clean) {
    throw new Error('Enter a number.')
  }

  // Strip prefixes if present
  let normalized = clean
  if (base === 2 && normalized.startsWith('0b')) normalized = normalized.slice(2)
  if (base === 8 && normalized.startsWith('0o')) normalized = normalized.slice(2)
  if (base === 16 && normalized.startsWith('0x')) normalized = normalized.slice(2)

  if (!normalized) {
    throw new Error('Enter a valid number value.')
  }

  // Validate characters per base
  const validChars: Record<NumberBase, RegExp> = {
    2: /^[01]+$/,
    8: /^[0-7]+$/,
    10: /^-?[0-9]+$/,
    16: /^[0-9a-f]+$/
  }

  if (!validChars[base].test(normalized)) {
    throw new Error(`Invalid characters for base ${base}.`)
  }

  // Parse based on base
  if (base === 10) {
    return BigInt(normalized)
  }
  if (base === 16) {
    return BigInt(`0x${normalized}`)
  }
  if (base === 2) {
    return BigInt(`0b${normalized}`)
  }
  if (base === 8) {
    return BigInt(`0o${normalized}`)
  }

  throw new Error('Unsupported base.')
}

export function convertFromBase(value: string, base: NumberBase): NumberBases {
  const n = parseNumberToBigInt(value, base)
  return {
    binary: n.toString(2),
    octal: n.toString(8),
    decimal: n.toString(10),
    hex: n.toString(16).toUpperCase()
  }
}
