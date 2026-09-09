import type { GradientInterpolation, GradientStop, GradientType } from './gradient'
import { clampAngle, createGradientStop } from './gradient'
import { parseColor } from './parse'

export interface GradientParseResult {
  type: GradientType
  angle: number
  interpolation: GradientInterpolation
  stops: GradientStop[]
  /** One message for each CSS token that the tool cannot keep. */
  warnings: string[]
}

const SIDE_ANGLES: Record<string, number> = {
  'top': 0,
  'right': 90,
  'bottom': 180,
  'left': 270,
  'top right': 45,
  'right top': 45,
  'bottom right': 135,
  'right bottom': 135,
  'bottom left': 225,
  'left bottom': 225,
  'top left': 315,
  'left top': 315,
}

const ANGLE_UNITS: Record<string, number> = {
  deg: 1,
  grad: 360 / 400,
  rad: 180 / Math.PI,
  turn: 360,
}

const SIDES = new Set(['top', 'right', 'bottom', 'left'])

const RADIAL_TOKENS = new Set([
  'circle',
  'ellipse',
  'at',
  'center',
  'closest-side',
  'closest-corner',
  'farthest-side',
  'farthest-corner',
])

/** Splits on the separator characters that are not inside brackets. */
function splitTop(value: string, separators: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''

  for (const char of value) {
    if (char === '(') {
      depth += 1
    }
    else if (char === ')') {
      depth -= 1
    }
    else if (depth === 0 && separators.includes(char)) {
      if (current.trim()) {
        parts.push(current.trim())
      }
      current = ''
      continue
    }
    current += char
  }

  if (current.trim()) {
    parts.push(current.trim())
  }
  return parts
}

function closeBracket(text: string, open: number): number {
  let depth = 0
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === '(') {
      depth += 1
    }
    else if (text[index] === ')') {
      depth -= 1
      if (depth === 0) {
        return index
      }
    }
  }
  return -1
}

function toAngle(token: string): number | null {
  const match = /^(-?[\d.]+)(deg|grad|rad|turn)$/i.exec(token)
  if (!match) {
    return null
  }
  const value = Number.parseFloat(match[1]!) * ANGLE_UNITS[match[2]!.toLowerCase()]!
  return Number.isFinite(value) ? value : null
}

const POSITION_TOKEN = /^-?[\d.]+%$/
const NUMBER_TOKEN = /^-?[\d.]+[a-z]*$/i

/** True when the argument is a color stop and not the direction of the gradient. */
function isStopArg(arg: string): boolean {
  const tokens = splitTop(arg, ' \t\n\r').filter(token => !NUMBER_TOKEN.test(token))
  if (tokens.length === 0) {
    return false
  }
  try {
    parseColor(tokens.join(' '))
    return true
  }
  catch {
    return false
  }
}

interface Prelude {
  angle: number | null
  interpolation: GradientInterpolation
}

function readPrelude(prelude: string, type: GradientType, warnings: string[]): Prelude {
  const tokens = splitTop(prelude, ' \t\n\r')
  let angle: number | null = null
  let interpolation: GradientInterpolation = 'srgb'
  const shape: string[] = []

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!
    const lower = token.toLowerCase()

    if (lower === 'in') {
      const space = tokens[index + 1]?.toLowerCase()
      index += 1
      if (space === 'oklch') {
        interpolation = 'oklch'
      }
      else {
        warnings.push(`The "${space ?? 'in'}" interpolation is not supported. The gradient interpolates in sRGB.`)
      }
      continue
    }

    const parsedAngle = toAngle(token)
    if (parsedAngle !== null) {
      angle = parsedAngle
      continue
    }

    if (lower === 'to') {
      const sides: string[] = []
      while (SIDES.has(tokens[index + 1]?.toLowerCase() ?? '')) {
        sides.push(tokens[index + 1]!.toLowerCase())
        index += 1
      }
      const keyword = sides.join(' ')
      if (keyword in SIDE_ANGLES) {
        angle = SIDE_ANGLES[keyword]!
      }
      else {
        warnings.push(`Unsupported gradient direction "to ${keyword}".`)
      }
      continue
    }

    const isShape = RADIAL_TOKENS.has(lower) || SIDES.has(lower) || POSITION_TOKEN.test(token)
    if (type === 'radial' && isShape) {
      shape.push(lower)
      continue
    }

    warnings.push(`Unsupported CSS token "${token}".`)
  }

  if (type === 'radial') {
    if (angle !== null) {
      warnings.push('A radial gradient has no angle. The tool ignores it.')
      angle = null
    }
    if (shape.length > 0 && shape.join(' ') !== 'circle') {
      warnings.push('Radial shape and position are not supported. The tool draws a centered circle.')
    }
  }

  return { angle, interpolation }
}

function readStops(args: string[], warnings: string[]): GradientStop[] {
  const collected: { color: string, alpha?: number, position: number | null }[] = []

  for (const arg of args) {
    const positions: number[] = []
    const colorTokens: string[] = []

    for (const token of splitTop(arg, ' \t\n\r')) {
      if (POSITION_TOKEN.test(token)) {
        positions.push(Number.parseFloat(token))
        continue
      }
      if (NUMBER_TOKEN.test(token)) {
        warnings.push(`Unsupported stop position "${token}". Use a percentage.`)
        continue
      }
      colorTokens.push(token)
    }

    if (positions.length > 1) {
      warnings.push(`A stop has more than one position. The tool keeps ${positions[0]}%.`)
    }

    const raw = colorTokens.join(' ')
    if (!raw) {
      warnings.push(`The color stop "${arg}" has no color.`)
      continue
    }

    try {
      const color = parseColor(raw)
      collected.push({ color: color.hex, alpha: color.alpha, position: positions[0] ?? null })
    }
    catch {
      warnings.push(`Unsupported color "${raw}".`)
    }
  }

  return collected.map((item, index) => {
    // CSS spreads a stop with no position across the gradient.
    const even = collected.length > 1 ? (index / (collected.length - 1)) * 100 : 0
    const stop = createGradientStop(item.color, item.position ?? even)
    return item.alpha === undefined ? stop : { ...stop, alpha: item.alpha }
  })
}

/**
 * Converts a CSS gradient value into editable color stops.
 *
 * It accepts a `linear-gradient()` or a `radial-gradient()` value, with or
 * without the `background:` prefix. It throws for input that it cannot use. It
 * reports each token that it cannot keep in `warnings`.
 */
export function parseGradientCss(input: string): GradientParseResult {
  const warnings: string[] = []
  const text = input
    .trim()
    .replace(/^background(?:-image)?\s*:/i, '')
    .replace(/;\s*$/, '')
    .trim()

  if (/^(?:repeating-)?conic-gradient\s*\(/i.test(text)) {
    throw new Error('Conic gradients are not supported. Paste a linear or radial gradient.')
  }
  if (/^repeating-/i.test(text)) {
    throw new Error('Repeating gradients are not supported. Paste a linear or radial gradient.')
  }

  const head = /^(linear|radial)-gradient\s*\(/i.exec(text)
  if (!head) {
    throw new Error('Paste a linear-gradient() or a radial-gradient() value.')
  }

  const open = head[0].length - 1
  const close = closeBracket(text, open)
  if (close === -1) {
    throw new Error('The gradient has no close bracket.')
  }
  if (text.slice(close + 1).trim()) {
    warnings.push('The background has more than one layer. The tool loaded the first gradient only.')
  }

  const type = head[1]!.toLowerCase() as GradientType
  const args = splitTop(text.slice(open + 1, close), ',')
  if (args.length === 0) {
    throw new Error('The gradient has no color stops.')
  }

  let angle = type === 'linear' ? 180 : 0
  let interpolation: GradientInterpolation = 'srgb'

  if (!isStopArg(args[0]!)) {
    const prelude = readPrelude(args.shift()!, type, warnings)
    angle = prelude.angle ?? angle
    interpolation = prelude.interpolation
  }

  const stops = readStops(args, warnings)
  if (stops.length < 2) {
    throw new Error('A gradient needs two color stops or more.')
  }

  return { type, angle: clampAngle(angle), interpolation, stops, warnings }
}
