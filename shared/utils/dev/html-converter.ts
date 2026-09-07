export interface JsxConvertOptions {
  wrapComponent?: boolean
  componentName?: string
  /** Adds a props parameter and spreads it on the root tag. An icon needs this. */
  spreadProps?: boolean
}

export interface VueConvertOptions {
  wrapSfc?: boolean
}

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

const JSX_ATTR_MAP: Record<string, string> = {
  'class': 'className',
  'for': 'htmlFor',
  'tabindex': 'tabIndex',
  'readonly': 'readOnly',
  'autocomplete': 'autoComplete',
  'autofocus': 'autoFocus',
  'colspan': 'colSpan',
  'rowspan': 'rowSpan',
  'maxlength': 'maxLength',
  'minlength': 'minLength',
  'crossorigin': 'crossOrigin',
  'novalidate': 'noValidate',
  'formnovalidate': 'formNoValidate',
  'frameborder': 'frameBorder',
  'allowfullscreen': 'allowFullScreen',
  // SVG attributes
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-miterlimit': 'strokeMiterlimit',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'stroke-opacity': 'strokeOpacity',
  'fill-rule': 'fillRule',
  'fill-opacity': 'fillOpacity',
  'clip-rule': 'clipRule',
  'clip-path': 'clipPath',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  'color-interpolation-filters': 'colorInterpolationFilters',
  'viewbox': 'viewBox',
}

export function splitCssDeclarations(styleStr: string): string[] {
  const declarations: string[] = []
  let current = ''
  let inSingle = false
  let inDouble = false
  let parenDepth = 0

  for (let i = 0; i < styleStr.length; i++) {
    const char = styleStr[i]!

    if (char === '\'' && !inDouble) {
      inSingle = !inSingle
      current += char
      continue
    }

    if (char === '"' && !inSingle) {
      inDouble = !inDouble
      current += char
      continue
    }

    if (!inSingle && !inDouble) {
      if (char === '(') {
        parenDepth++
      }
      else if (char === ')' && parenDepth > 0) {
        parenDepth--
      }
      else if (char === ';' && parenDepth === 0) {
        if (current.trim()) {
          declarations.push(current.trim())
        }
        current = ''
        continue
      }
    }

    current += char
  }

  if (current.trim()) {
    declarations.push(current.trim())
  }

  return declarations
}

export function parseCssToJsxStyle(styleStr: string): string {
  const parts = splitCssDeclarations(styleStr)
  const entries: string[] = []

  for (const part of parts) {
    const colon = part.indexOf(':')
    if (colon === -1)
      continue
    const prop = part.slice(0, colon).trim()
    const val = part.slice(colon + 1).trim()

    let key = prop
    if (key.startsWith('--')) {
      key = `'${key}'`
    }
    else {
      key = key.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase())
    }

    const cleanVal = val.replace(/'/g, '\\\'')
    entries.push(`${key}: '${cleanVal}'`)
  }

  return `style={{ ${entries.join(', ')} }}`
}

export function selfCloseVoidTags(html: string): string {
  // Matches void tags that do not end with />
  const regex = /<([\w-]+)((?:\s[^>]*)?)>/g
  return html.replace(regex, (match, tagName: string, attrs: string) => {
    const lower = tagName.toLowerCase()
    if (VOID_TAGS.has(lower)) {
      const trimmedAttrs = attrs.trimEnd()
      if (trimmedAttrs.endsWith('/')) {
        return match
      }
      return `<${tagName}${attrs} />`
    }
    return match
  })
}

export function convertHtmlToJsx(html: string, options: JsxConvertOptions = {}): string {
  const input = html.trim()
  if (!input)
    return ''

  // 1. Convert HTML comments <!-- ... --> to JSX {/* ... */}
  let output = input.replace(/<!--([\s\S]*?)-->/g, '{/*$1*/}')

  // 2. Self-close void tags
  output = selfCloseVoidTags(output)

  // 3. Process tags and attributes
  output = output.replace(/<([\w-]+)((?:\s[^>]*)?)>/g, (_, tagName: string, attrs: string) => {
    let newAttrs = attrs

    // Convert inline styles: style="..." or style='...'
    newAttrs = newAttrs.replace(/(?<![\w-])style=(["'])([\s\S]*?)\1/g, (__, ___, styleContent: string) => {
      return parseCssToJsxStyle(styleContent)
    })

    // Convert attributes according to JSX_ATTR_MAP
    for (const [htmlAttr, jsxAttr] of Object.entries(JSX_ATTR_MAP)) {
      const attrRegex = new RegExp(`(?<![\\w-])${htmlAttr}=`, 'g')
      newAttrs = newAttrs.replace(attrRegex, `${jsxAttr}=`)
    }

    return `<${tagName}${newAttrs}>`
  })

  // 4. Component wrapper
  if (options.wrapComponent) {
    const name = options.componentName?.trim() || 'MyComponent'

    // A caller of an icon needs to pass className, width, and the rest.
    if (options.spreadProps) {
      output = output.replace(/^<([\w-]+)/, '<$1 {...props}')
    }

    const indented = output
      .split('\n')
      .map(line => (line ? `    ${line}` : ''))
      .join('\n')

    const params = options.spreadProps ? 'props' : ''
    return `export default function ${name}(${params}) {\n  return (\n${indented}\n  );\n}`
  }

  return output
}

export function convertHtmlToVue(html: string, options: VueConvertOptions = {}): string {
  const input = html.trim()
  if (!input)
    return ''

  // 1. Self-close void tags for valid clean Vue template
  let output = selfCloseVoidTags(input)

  // 2. Convert standard HTML inline events if any: onclick="foo()" -> @click="foo()"
  output = output.replace(/(?<![\w-])on([a-z]+)=/g, (_, ev: string) => `@${ev}=`)

  if (options.wrapSfc) {
    const indented = output
      .split('\n')
      .map(line => (line ? `  ${line}` : ''))
      .join('\n')

    return `<script setup lang="ts">\n// Component logic\n</script>\n\n<template>\n${indented}\n</template>\n`
  }

  return output
}
