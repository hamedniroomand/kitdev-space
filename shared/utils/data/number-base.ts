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

  const isNegative = clean.startsWith('-')
  const unsigned = isNegative ? clean.slice(1) : clean

  // Strip prefixes if present
  let normalized = unsigned
  if (base === 2 && normalized.startsWith('0b'))
    normalized = normalized.slice(2)
  if (base === 8 && normalized.startsWith('0o'))
    normalized = normalized.slice(2)
  if (base === 16 && normalized.startsWith('0x'))
    normalized = normalized.slice(2)

  if (!normalized) {
    throw new Error('Enter a valid number value.')
  }

  // Validate characters per base
  const validChars: Record<NumberBase, RegExp> = {
    2: /^[01]+$/,
    8: /^[0-7]+$/,
    10: /^\d+$/,
    16: /^[0-9a-f]+$/,
  }

  if (!validChars[base].test(normalized)) {
    throw new Error(`Invalid characters for base ${base}.`)
  }

  // Parse based on base
  let n: bigint
  if (base === 10) {
    n = BigInt(normalized)
  }
  else if (base === 16) {
    n = BigInt(`0x${normalized}`)
  }
  else if (base === 2) {
    n = BigInt(`0b${normalized}`)
  }
  else if (base === 8) {
    n = BigInt(`0o${normalized}`)
  }
  else {
    throw new Error('Unsupported base.')
  }

  return isNegative ? -n : n
}

export function convertFromBase(value: string, base: NumberBase): NumberBases {
  const n = parseNumberToBigInt(value, base)
  return {
    binary: n.toString(2),
    octal: n.toString(8),
    decimal: n.toString(10),
    hex: n.toString(16).toUpperCase(),
  }
}

/**
 * Returns an array of character validation results for the given input string.
 * Each element is `true` when the character is valid for the given base.
 */
export function validateDigits(value: string, base: NumberBase): boolean[] {
  const clean = value.trim().toLowerCase()
  const isNeg = clean.startsWith('-')
  const body = isNeg ? clean.slice(1) : clean

  // Strip common prefixes before validating digits
  let start = 0
  if (base === 2 && body.startsWith('0b'))
    start = 2
  if (base === 8 && body.startsWith('0o'))
    start = 2
  if (base === 16 && body.startsWith('0x'))
    start = 2

  const validChar: Record<NumberBase, (ch: string) => boolean> = {
    2: ch => ch === '0' || ch === '1',
    8: ch => ch >= '0' && ch <= '7',
    10: ch => ch >= '0' && ch <= '9',
    16: ch => /^[0-9a-f]$/i.test(ch),
  }

  return [...value].map((ch, i) => {
    if (ch === '-' && i === 0) {
      return true
    }
    // Characters that form a prefix (0b, 0x, 0o) are always valid at their offset
    const bodyIndex = isNeg ? i - 1 : i
    if (bodyIndex < start) {
      return true
    }
    return validChar[base](ch.toLowerCase())
  })
}

/**
 * Inserts separator characters into a digit string for readability.
 * Binary groups by 4, others by 3 for decimal or groups of 2 for hex/octal.
 */
export function groupDigits(value: string, base: NumberBase, separator = '_'): string {
  const clean = value.trim()
  if (!clean || clean === '-') {
    return clean
  }

  const isNeg = clean.startsWith('-')
  const body = isNeg ? clean.slice(1) : clean

  // Determine group size
  const groupSize = base === 2 ? 4 : base === 16 ? 2 : 3

  // Group from right to left
  let grouped = ''
  let count = 0
  for (let i = body.length - 1; i >= 0; i--) {
    if (count > 0 && count % groupSize === 0) {
      grouped = separator + grouped
    }
    grouped = body[i] + grouped
    count++
  }

  return (isNeg ? '-' : '') + grouped
}

export type TwosComplementWidth = 8 | 16 | 32 | 64

/**
 * Returns the two's complement representation of a decimal integer
 * for the given bit width. Returns null if the value is out of range.
 */
export function twosComplement(decimalValue: string, width: TwosComplementWidth): string | null {
  let n: bigint
  try {
    n = BigInt(decimalValue.trim())
  }
  catch {
    return null
  }

  const zero = BigInt(0)
  const one = BigInt(1)
  const bits = BigInt(width)
  const mask = (one << bits) - one

  // Clamp n to the signed two's complement range
  const maxPos = (one << (bits - one)) - one
  const minNeg = -(one << (bits - one))

  if (n > maxPos || n < minNeg) {
    return null
  }

  const twos = n < zero ? (n + (one << bits)) & mask : n & mask
  return twos.toString(16).toUpperCase().padStart(Number(bits / BigInt(4)), '0')
}
