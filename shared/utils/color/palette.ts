import { generateTailwindPalette } from './tailwind'

const BASE_SHADE = '500'

/**
 * Take `count` steps from the Tailwind shade scale of the base color.
 *
 * The scale holds 11 steps, so a larger count gives 11 colors.
 */
export function createPalette(base: string, count = 5): string[] {
  const shades = generateTailwindPalette(base)
  const anchor = shades.findIndex(shade => shade.shade === BASE_SHADE)
  const size = Math.min(shades.length, Math.max(3, Math.floor(count)))
  const steps = Array.from(
    { length: size },
    (_, index) => Math.round((index * (shades.length - 1)) / (size - 1)),
  )

  // An even count has no middle step, so move the nearest step onto the base color.
  if (!steps.includes(anchor)) {
    const nearest = steps.reduce(
      (best, step, index) => Math.abs(step - anchor) < Math.abs(steps[best]! - anchor) ? index : best,
      0,
    )
    steps[nearest] = anchor
  }

  return steps.map(step => shades[step]!.hex)
}
