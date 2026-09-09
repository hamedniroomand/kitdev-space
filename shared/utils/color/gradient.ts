import { contrastRatio, wcagLevel } from './contrast'
import { parseColor } from './parse'

export type GradientType = 'linear' | 'radial'

/** The color space that the browser interpolates the stops in. */
export type GradientInterpolation = 'srgb' | 'oklch'

export interface GradientStop {
  id: string
  color: string
  position: number
  /** Opacity, 0 to 1. An undefined value means 1. */
  alpha?: number
}

export interface GradientOptions {
  type: GradientType
  angle: number
  stops: GradientStop[]
  interpolation?: GradientInterpolation
}

export interface GradientContrastResult {
  textColor: string
  worstRatio: number
  levels: { aa: boolean, aaa: boolean }
  samples: { label: string, color: string, ratio: number }[]
}

export function clampPosition(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.min(100, Math.max(0, Math.round(value)))
}

export function clampAngle(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  const next = Math.round(value) % 360
  return next < 0 ? next + 360 : next
}

export function createGradientStop(color: string, position: number, id?: string): GradientStop {
  return {
    id: id ?? `stop-${Math.random().toString(36).slice(2, 10)}`,
    color,
    position: clampPosition(position),
  }
}

export function sortStops(stops: GradientStop[]): GradientStop[] {
  return [...stops].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
}

export function formatGradientCss(options: GradientOptions): string {
  if (options.stops.length < 2) {
    throw new Error('Add at least two color stops.')
  }

  const stops = sortStops(options.stops)
    .map(stop => `${stopColorCss(stop)} ${clampPosition(stop.position)}%`)
    .join(', ')

  const space = options.interpolation === 'oklch' ? ' in oklch' : ''

  if (options.type === 'radial') {
    return `radial-gradient(circle${space}, ${stops})`
  }

  return `linear-gradient(${clampAngle(options.angle)}deg${space}, ${stops})`
}

/** Returns the stop color as hex. It adds the alpha byte only when the stop is not opaque. */
export function stopColorCss(stop: GradientStop): string {
  const hex = parseColor(stop.color).hex
  const alpha = stop.alpha ?? 1
  if (alpha >= 1) {
    return hex
  }
  return `${hex}${Math.round(Math.max(0, alpha) * 255).toString(16).padStart(2, '0')}`
}

export function formatGradientDeclaration(options: GradientOptions): string {
  return `background: ${formatGradientCss(options)};`
}

export function averageStopColor(stops: GradientStop[]): string {
  if (stops.length === 0) {
    throw new Error('Add at least one color stop.')
  }

  let r = 0
  let g = 0
  let b = 0

  for (const stop of stops) {
    const rgb = parseColor(stop.color).rgb
    r += rgb.r
    g += rgb.g
    b += rgb.b
  }

  const count = stops.length
  return `#${[r / count, g / count, b / count]
    .map(value => Math.round(value).toString(16).padStart(2, '0'))
    .join('')}`
}

export function checkGradientTextContrast(
  textColor: string,
  stops: GradientStop[],
): GradientContrastResult {
  if (stops.length === 0) {
    throw new Error('Add at least one color stop.')
  }

  const sorted = sortStops(stops)
  const samples = [
    ...sorted.map((stop, index) => ({
      label: `Stop ${index + 1}`,
      color: parseColor(stop.color).hex,
    })),
    {
      label: 'Average',
      color: averageStopColor(sorted),
    },
  ].map(sample => ({
    ...sample,
    ratio: contrastRatio(textColor, sample.color),
  }))

  const worst = samples.reduce((min, sample) => (sample.ratio < min.ratio ? sample : min))
  return {
    textColor: parseColor(textColor).hex,
    worstRatio: worst.ratio,
    levels: wcagLevel(worst.ratio),
    samples,
  }
}
