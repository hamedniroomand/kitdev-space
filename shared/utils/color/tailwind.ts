import { parseColor } from './parse'

export interface TailwindShade {
  shade: string
  hex: string
  isDark: boolean
}

export type TailwindPalette = Record<string, string>

function hslToHex(h: number, s: number, l: number): string {
  const normH = h / 360
  const normS = s / 100
  const normL = l / 100

  let r: number, g: number, b: number

  if (normS === 0) {
    r = g = b = normL
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      let curT = t
      if (curT < 0) curT += 1
      if (curT > 1) curT -= 1
      if (curT < 1 / 6) return p + (q - p) * 6 * curT
      if (curT < 1 / 2) return q
      if (curT < 2 / 3) return p + (q - p) * (2 / 3 - curT) * 6
      return p
    }

    const q = normL < 0.5 ? normL * (1 + normS) : normL + normS - normL * normS
    const p = 2 * normL - q
    r = hue2rgb(p, q, normH + 1 / 3)
    g = hue2rgb(p, q, normH)
    b = hue2rgb(p, q, normH - 1 / 3)
  }

  const toHex = (x: number) => Math.round(Math.min(255, Math.max(0, x * 255))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function generateTailwindPalette(colorInput: string): TailwindShade[] {
  const parsed = parseColor(colorInput)
  const { h, s, l } = parsed.hsl

  const lighter = [
    { key: '50', t: 0.95 },
    { key: '100', t: 0.82 },
    { key: '200', t: 0.65 },
    { key: '300', t: 0.45 },
    { key: '400', t: 0.22 }
  ]

  const darker = [
    { key: '600', t: 0.16 },
    { key: '700', t: 0.35 },
    { key: '800', t: 0.55 },
    { key: '900', t: 0.74 },
    { key: '950', t: 0.88 }
  ]

  const shades: TailwindShade[] = []

  for (const item of lighter) {
    const curL = l + (97 - l) * item.t
    const curS = Math.max(15, s - 10 * item.t)
    shades.push({
      shade: item.key,
      hex: hslToHex(h, curS, curL),
      isDark: curL < 50
    })
  }

  shades.push({
    shade: '500',
    hex: parsed.hex.toLowerCase(),
    isDark: l < 50
  })

  for (const item of darker) {
    const curL = Math.max(8, l - (l - 8) * item.t)
    const curS = Math.min(100, Math.max(20, s + (item.t > 0.5 ? -15 * item.t : 5 * item.t)))
    shades.push({
      shade: item.key,
      hex: hslToHex(h, curS, curL),
      isDark: curL < 50
    })
  }

  return shades
}

export function formatAsTailwindV4(shades: TailwindShade[], colorName = 'primary'): string {
  const lines = shades.map(s => `  --color-${colorName}-${s.shade}: ${s.hex};`)
  return `@theme {\n${lines.join('\n')}\n}`
}

export function formatAsTailwindV3(shades: TailwindShade[], colorName = 'primary'): string {
  const shadeLines = shades.map(s => `      '${s.shade}': '${s.hex}',`)
  return `module.exports = {
  theme: {
    extend: {
      colors: {
        '${colorName}': {
${shadeLines.join('\n')}
        }
      }
    }
  }
};`
}

export function formatAsCssVars(shades: TailwindShade[], colorName = 'primary'): string {
  const lines = shades.map(s => `  --${colorName}-${s.shade}: ${s.hex};`)
  return `:root {\n${lines.join('\n')}\n}`
}
