export type SvgComponentTarget = 'react' | 'vue'

const ATTR_MAP: Record<string, string> = {
  'class': 'className',
  'for': 'htmlFor',
  'clip-path': 'clipPath',
  'clip-rule': 'clipRule',
  'color-interpolation': 'colorInterpolation',
  'color-interpolation-filters': 'colorInterpolationFilters',
  'fill-opacity': 'fillOpacity',
  'fill-rule': 'fillRule',
  'font-family': 'fontFamily',
  'font-size': 'fontSize',
  'font-style': 'fontStyle',
  'font-weight': 'fontWeight',
  'marker-end': 'markerEnd',
  'marker-mid': 'markerMid',
  'marker-start': 'markerStart',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-miterlimit': 'strokeMiterlimit',
  'stroke-opacity': 'strokeOpacity',
  'stroke-width': 'strokeWidth',
  'text-anchor': 'textAnchor',
  'text-decoration': 'textDecoration',
  'unicode-bidi': 'unicodeBidi',
  'word-spacing': 'wordSpacing',
  'writing-mode': 'writingMode',
  'xlink:href': 'xlinkHref',
  'xml:lang': 'xmlLang',
  'xml:space': 'xmlSpace'
}

function toCamelCase(attr: string): string {
  if (ATTR_MAP[attr]) {
    return ATTR_MAP[attr]!
  }
  if (attr.startsWith('data-') || attr.startsWith('aria-')) {
    return attr
  }
  return attr.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase())
}

function cleanSvg(input: string): string {
  return input
    .trim()
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim()
}

function convertAttributes(svg: string, target: SvgComponentTarget): string {
  return svg.replace(/<([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g, (_full, tag: string, attrs: string, selfClose: string) => {
    const nextAttrs = attrs.replace(
      /([:@]?[a-zA-Z_:][\w:.-]*)(\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g,
      (match: string, name: string, valuePart: string | undefined) => {
        if (name.startsWith(':') || name.startsWith('@')) {
          return match
        }
        if (target === 'react') {
          const mapped = toCamelCase(name)
          if (!valuePart) {
            return mapped
          }
          if (mapped === 'style' && /=\s*["']/.test(valuePart)) {
            return match
          }
          return `${mapped}${valuePart}`
        }
        return match
      }
    )
    return `<${tag}${nextAttrs}${selfClose}>`
  })
}

export function svgToComponent(input: string, target: SvgComponentTarget): string {
  if (!input.trim()) {
    throw new Error('Paste SVG code before you run the tool.')
  }

  const cleaned = cleanSvg(input)
  if (!/<svg\b/i.test(cleaned)) {
    throw new Error('Input must include an <svg> element.')
  }

  if (target === 'vue') {
    return `<template>\n  ${cleaned}\n</template>\n`
  }

  const jsx = convertAttributes(cleaned, 'react')
  return `export function SvgIcon(props) {\n  return (\n    ${jsx.replace(/^<svg\b/i, '<svg {...props}')}\n  )\n}\n`
}
