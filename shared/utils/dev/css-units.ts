export type CssUnit = 'px' | 'rem' | 'em' | 'vw' | 'vh'

export interface CssUnitConversionOptions {
  rootFontSize?: number
  parentFontSize?: number
  viewportWidth?: number
  viewportHeight?: number
}

export const CSS_UNITS: CssUnit[] = ['px', 'rem', 'em', 'vw', 'vh']

/** `rem` follows the root font size. `em` follows the parent font size. */
function fontSizes(options?: CssUnitConversionOptions) {
  const rootFontSize = options?.rootFontSize ?? 16
  return { rootFontSize, parentFontSize: options?.parentFontSize ?? rootFontSize }
}

export function toPx(
  value: number,
  fromUnit: CssUnit,
  options?: CssUnitConversionOptions,
): number {
  const { rootFontSize, parentFontSize } = fontSizes(options)
  const viewportWidth = options?.viewportWidth ?? 1920
  const viewportHeight = options?.viewportHeight ?? 1080

  switch (fromUnit) {
    case 'px':
      return value
    case 'rem':
      return value * rootFontSize
    case 'em':
      return value * parentFontSize
    case 'vw':
      return (value * viewportWidth) / 100
    case 'vh':
      return (value * viewportHeight) / 100
  }
}

export function fromPx(
  pxValue: number,
  toUnit: CssUnit,
  options?: CssUnitConversionOptions,
): number {
  const { rootFontSize, parentFontSize } = fontSizes(options)
  const viewportWidth = options?.viewportWidth ?? 1920
  const viewportHeight = options?.viewportHeight ?? 1080

  switch (toUnit) {
    case 'px':
      return pxValue
    case 'rem':
      return rootFontSize === 0 ? 0 : pxValue / rootFontSize
    case 'em':
      return parentFontSize === 0 ? 0 : pxValue / parentFontSize
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
  options?: CssUnitConversionOptions,
): number {
  const px = toPx(value, fromUnit, options)
  return fromPx(px, toUnit, options)
}

export function convertAllCssUnits(
  value: number,
  fromUnit: CssUnit,
  options?: CssUnitConversionOptions,
): Record<CssUnit, number> {
  const px = toPx(value, fromUnit, options)
  return {
    px: fromPx(px, 'px', options),
    rem: fromPx(px, 'rem', options),
    em: fromPx(px, 'em', options),
    vw: fromPx(px, 'vw', options),
    vh: fromPx(px, 'vh', options),
  }
}

/** Print a length with up to 4 decimals and no trailing zero. */
export function formatCssNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)))
}

// A comment, a string, or a `url()` keeps its text. The last alternative of
// each pair accepts an unterminated snippet, so a partial paste stays intact.
const SKIP_REGION = /\/\*[\s\S]*?(?:\*\/|$)|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?|url\((?:\\.|[^)\\])*\)?/gi

// A number that ends a `px` length. The lookbehind stops a match inside an
// identifier such as `--gap-4px`.
const PX_VALUE = /(?<![\w.#-])(-?(?:\d+(?:\.\d+)?|\.\d+))px(?![\w-])/g

function rewritePxValues(text: string, rootFontSize: number): string {
  return text.replace(PX_VALUE, (match, raw: string) => {
    const value = Number(raw)
    if (value === 0) {
      return '0'
    }
    // A 1px line is a hairline. In `rem` it blurs or disappears, so it stays.
    if (Math.abs(value) === 1) {
      return match
    }
    return `${formatCssNumber(value / rootFontSize)}rem`
  })
}

/**
 * Convert every `px` length of a CSS snippet to `rem`.
 *
 * `0px` becomes `0`. A 1px length stays. Text in a comment, a string, or a
 * `url()` stays.
 *
 * ponytail: the scanner reads the text with a regular expression, not with a
 * CSS parser, so it has no property context. It rewrites a px value in a
 * selector such as `[data-size=10px]` and in a media query such as
 * `@media (min-width: 768px)`, where rem reads the initial root font size. An
 * unterminated `url(` also takes the rest of the input. Add a CSS tokenizer if
 * a user needs those cases.
 */
export function convertPxSnippetToRem(css: string, rootFontSize = 16): string {
  if (!(rootFontSize > 0)) {
    return css
  }

  let result = ''
  let index = 0
  for (const skip of css.matchAll(SKIP_REGION)) {
    result += rewritePxValues(css.slice(index, skip.index), rootFontSize) + skip[0]
    index = skip.index + skip[0].length
  }
  return result + rewritePxValues(css.slice(index), rootFontSize)
}
