export type CssUnit = 'px' | 'rem' | 'em' | 'vw' | 'vh'

export interface CssUnitConversionOptions {
  rootFontSize?: number
  viewportWidth?: number
  viewportHeight?: number
}

export const CSS_UNITS: CssUnit[] = ['px', 'rem', 'em', 'vw', 'vh']

export function toPx(
  value: number,
  fromUnit: CssUnit,
  options?: CssUnitConversionOptions
): number {
  const rootFontSize = options?.rootFontSize ?? 16
  const viewportWidth = options?.viewportWidth ?? 1920
  const viewportHeight = options?.viewportHeight ?? 1080

  switch (fromUnit) {
    case 'px':
      return value
    case 'rem':
    case 'em':
      return value * rootFontSize
    case 'vw':
      return (value * viewportWidth) / 100
    case 'vh':
      return (value * viewportHeight) / 100
  }
}

export function fromPx(
  pxValue: number,
  toUnit: CssUnit,
  options?: CssUnitConversionOptions
): number {
  const rootFontSize = options?.rootFontSize ?? 16
  const viewportWidth = options?.viewportWidth ?? 1920
  const viewportHeight = options?.viewportHeight ?? 1080

  switch (toUnit) {
    case 'px':
      return pxValue
    case 'rem':
    case 'em':
      return rootFontSize === 0 ? 0 : pxValue / rootFontSize
    case 'vw':
      return viewportWidth === 0 ? 0 : (pxValue / viewportWidth) * 100
    case 'vh':
      return viewportHeight === 0 ? 0 : (pxValue / viewportHeight) * 100
  }
}

export function convertCssUnit(
  value: number,
  fromUnit: CssUnit,
  toUnit: CssUnit,
  options?: CssUnitConversionOptions
): number {
  const px = toPx(value, fromUnit, options)
  return fromPx(px, toUnit, options)
}

export function convertAllCssUnits(
  value: number,
  fromUnit: CssUnit,
  options?: CssUnitConversionOptions
): Record<CssUnit, number> {
  const px = toPx(value, fromUnit, options)
  return {
    px: fromPx(px, 'px', options),
    rem: fromPx(px, 'rem', options),
    em: fromPx(px, 'em', options),
    vw: fromPx(px, 'vw', options),
    vh: fromPx(px, 'vh', options)
  }
}
