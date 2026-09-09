/**
 * HTML and SVG to JSX or Vue with `DOMParser` and `XMLSerializer` rules.
 *
 * The parser reads the markup, so a `>` inside an attribute, an unclosed tag,
 * or several root elements cannot break the output. The walker writes the tree
 * again for the target. It never reads a tag with a regular expression.
 *
 * Every construct that the target cannot hold goes to `notes`, so the tool can
 * name it. The converter drops nothing without a note.
 */

export type ConvertTarget = 'jsx' | 'vue'

export type ConvertNoteKind = 'doctype' | 'script' | 'event' | 'attribute' | 'style'

export interface ConvertNote {
  kind: ConvertNoteKind
  detail: string
}

export interface ConvertResult {
  code: string
  notes: ConvertNote[]
}

export interface JsxConvertOptions {
  wrapComponent?: boolean
  componentName?: string
  /** Adds a props parameter and spreads it on the root tag. An icon needs this. */
  spreadProps?: boolean
  /** Adds a `title` parameter and writes the SVG `<title>` from it. */
  titleProp?: boolean
}

export interface VueConvertOptions {
  wrapSfc?: boolean
}

const ELEMENT_NODE = 1
const TEXT_NODE = 3
const CDATA_NODE = 4
const COMMENT_NODE = 8

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

/** An attribute of this group with an empty value is written without a value. */
const BOOLEAN_ATTRS = new Set([
  'allowfullscreen',
  'async',
  'autofocus',
  'autoplay',
  'checked',
  'controls',
  'default',
  'defer',
  'disabled',
  'hidden',
  'inert',
  'ismap',
  'itemscope',
  'loop',
  'multiple',
  'muted',
  'novalidate',
  'open',
  'playsinline',
  'readonly',
  'required',
  'reversed',
  'selected',
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
  'contenteditable': 'contentEditable',
  'spellcheck': 'spellCheck',
  'srcset': 'srcSet',
  'usemap': 'useMap',
  'enctype': 'encType',
  'datetime': 'dateTime',
  'accept-charset': 'acceptCharset',
  'http-equiv': 'httpEquiv',
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
  'xlink:href': 'xlinkHref',
  'xlink:title': 'xlinkTitle',
  'xml:lang': 'xmlLang',
  'xml:space': 'xmlSpace',
  'xmlns:xlink': 'xmlnsXlink',
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

/** `dropped` collects each declaration that has no colon, so the tool can name it. */
export function parseCssToJsxStyle(styleStr: string, dropped?: string[]): string {
  const parts = splitCssDeclarations(styleStr)
  const entries: string[] = []

  for (const part of parts) {
    const colon = part.indexOf(':')
    if (colon === -1) {
      dropped?.push(part)
      continue
    }
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

function getParser(): DOMParser | null {
  // Some DOM environments bind the class to their window, so read it from there when it exists.
  const Parser = (globalThis as { window?: { DOMParser?: typeof DOMParser } }).window?.DOMParser
    ?? (typeof DOMParser === 'undefined' ? undefined : DOMParser)
  return Parser ? new Parser() : null
}

/** True when the runtime has the `DOMParser` that the conversion needs. */
export function canConvertInBrowser(): boolean {
  return getParser() !== null
}

interface WalkContext {
  target: ConvertTarget
  notes: ConvertNote[]
  /** The root element that keeps its `<title>` as a prop instead of a child. */
  titleRoot: Element | null
}

function addNote(ctx: WalkContext, kind: ConvertNoteKind, detail: string) {
  if (!ctx.notes.some(note => note.kind === kind && note.detail === detail)) {
    ctx.notes.push({ kind, detail })
  }
}

function escapeAttrValue(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

function escapeText(text: string, target: ConvertTarget): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\u00A0/g, '&nbsp;')

  // A brace opens an expression in JSX, and a double brace opens one in Vue.
  return target === 'jsx'
    ? escaped.replace(/\{/g, '&#123;').replace(/\}/g, '&#125;')
    : escaped.replace(/\{\{/g, '&#123;&#123;').replace(/\}\}/g, '&#125;&#125;')
}

function escapeTemplateLiteral(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
}

function uniqueId(base: string, seen: Set<string>): string {
  let index = 2
  while (seen.has(`${base}-${index}`)) {
    index++
  }
  return `${base}-${index}`
}

/**
 * Gives every duplicate `id` a new unique name. The map of a root holds the
 * renames of that root only, so a reference in another SVG stays as it is.
 */
function collectIds(
  nodes: Node[],
  seen: Set<string>,
  renames: Map<Element | null, Map<string, string>>,
  ids: Map<Element, string>,
  root: Element | null,
) {
  for (const node of nodes) {
    if (node.nodeType !== ELEMENT_NODE) {
      continue
    }
    const element = node as Element
    const nextRoot = element.localName === 'svg' ? element : root
    const id = element.getAttribute('id')

    if (id) {
      if (seen.has(id)) {
        const next = uniqueId(id, seen)
        ids.set(element, next)
        seen.add(next)
        const map = renames.get(nextRoot) ?? new Map<string, string>()
        map.set(id, next)
        renames.set(nextRoot, map)
      }
      else {
        seen.add(id)
      }
    }

    collectIds(Array.from(element.childNodes), seen, renames, ids, nextRoot)
  }
}

/** Rewrites `url(#id)`, `href="#id"`, and the `begin` or `end` of an animation. */
function rewriteRefs(name: string, value: string, refs: Map<string, string>): string {
  if (!refs.size) {
    return value
  }

  let out = value.replace(
    /url\(\s*(['"]?)#([^'")\s]+)\1\s*\)/g,
    (match, quote: string, id: string) => {
      const next = refs.get(id)
      return next ? `url(${quote}#${next}${quote})` : match
    },
  )

  if ((name === 'href' || name === 'xlink:href') && out.startsWith('#')) {
    const next = refs.get(out.slice(1))
    if (next) {
      out = `#${next}`
    }
  }

  if (name === 'begin' || name === 'end') {
    out = out
      .split(';')
      .map((part) => {
        const dot = part.indexOf('.')
        if (dot === -1) {
          return part
        }
        const id = part.slice(0, dot).trim()
        const next = refs.get(id)
        return next ? part.replace(id, next) : part
      })
      .join(';')
  }

  return out
}

function jsxAttribute(
  element: Element,
  name: string,
  value: string,
  ctx: WalkContext,
): string | null {
  const tag = element.localName
  const lower = name.toLowerCase()

  if (lower.startsWith('on') && lower.length > 2) {
    addNote(ctx, 'event', `${name} on <${tag}>: ${value}`)
    return null
  }

  if (lower === 'style') {
    const dropped: string[] = []
    const style = parseCssToJsxStyle(value, dropped)
    for (const declaration of dropped) {
      addNote(ctx, 'style', `${declaration} on <${tag}>`)
    }
    return style
  }

  if (lower === 'selected' && tag === 'option') {
    addNote(ctx, 'attribute', 'selected on <option>: set defaultValue on the <select>')
    return null
  }

  let jsxName = JSX_ATTR_MAP[lower] ?? name
  if (lower === 'checked' && tag === 'input') {
    jsxName = 'defaultChecked'
  }
  else if (lower === 'value' && (tag === 'input' || tag === 'textarea' || tag === 'select')) {
    jsxName = 'defaultValue'
  }

  if (jsxName.includes(':')) {
    addNote(ctx, 'attribute', `${name} on <${tag}>: JSX has no name for it`)
    return null
  }

  if (BOOLEAN_ATTRS.has(lower) && (value === '' || value.toLowerCase() === lower)) {
    return jsxName
  }

  return `${jsxName}="${escapeAttrValue(value)}"`
}

function vueAttribute(element: Element, name: string, value: string): string {
  const lower = name.toLowerCase()

  if (lower.startsWith('on') && lower.length > 2) {
    return `@${lower.slice(2)}="${escapeAttrValue(value)}"`
  }

  if (BOOLEAN_ATTRS.has(lower) && (value === '' || value.toLowerCase() === lower)) {
    return name
  }

  return `${name}="${escapeAttrValue(value)}"`
}

function serializeElement(
  element: Element,
  ctx: WalkContext,
  refs: Map<string, string>,
  renames: Map<Element | null, Map<string, string>>,
  ids: Map<Element, string>,
  extraAttrs: string,
  prependChildren: string,
): string {
  const tag = element.localName

  if (tag === 'script') {
    const src = element.getAttribute('src')
    addNote(ctx, 'script', src ? `<script src="${src}">` : '<script> block')
    return ''
  }

  if (tag === 'title' && element.parentElement === ctx.titleRoot) {
    return ''
  }

  const nextRefs = tag === 'svg' ? (renames.get(element) ?? new Map<string, string>()) : refs
  const parts: string[] = []

  for (const attr of Array.from(element.attributes)) {
    const name = attr.name
    // An aria or data attribute stays byte-identical in both targets.
    if (name.startsWith('aria-') || name.startsWith('data-')) {
      parts.push(`${name}="${escapeAttrValue(attr.value)}"`)
      continue
    }

    const rewritten = name === 'id'
      ? (ids.get(element) ?? attr.value)
      : rewriteRefs(name, attr.value, nextRefs)

    const written = ctx.target === 'jsx'
      ? jsxAttribute(element, name, rewritten, ctx)
      : vueAttribute(element, name, rewritten)

    if (written !== null) {
      parts.push(written)
    }
  }

  if (extraAttrs) {
    parts.unshift(extraAttrs)
  }

  const attrText = parts.length ? ` ${parts.join(' ')}` : ''
  const children = Array.from(element.childNodes)

  if (tag === 'style') {
    const css = element.textContent ?? ''
    const body = ctx.target === 'jsx' ? `{\`${escapeTemplateLiteral(css)}\`}` : css
    return `<${tag}${attrText}>${body}</${tag}>`
  }

  if (VOID_TAGS.has(tag) || (!children.length && !prependChildren)) {
    return `<${tag}${attrText} />`
  }

  const inner = prependChildren
    + children.map(child => serializeNode(child, ctx, nextRefs, renames, ids)).join('')

  return `<${tag}${attrText}>${inner}</${tag}>`
}

function serializeNode(
  node: Node,
  ctx: WalkContext,
  refs: Map<string, string>,
  renames: Map<Element | null, Map<string, string>>,
  ids: Map<Element, string>,
  extraAttrs = '',
  prependChildren = '',
): string {
  if (node.nodeType === ELEMENT_NODE) {
    return serializeElement(node as Element, ctx, refs, renames, ids, extraAttrs, prependChildren)
  }

  if (node.nodeType === TEXT_NODE || node.nodeType === CDATA_NODE) {
    return escapeText(node.nodeValue ?? '', ctx.target)
  }

  if (node.nodeType === COMMENT_NODE) {
    const text = node.nodeValue ?? ''
    return ctx.target === 'jsx'
      ? `{/*${text.replace(/\*\//g, '*\\/')}*/}`
      : `<!--${text}-->`
  }

  return ''
}

interface ConvertInternalOptions {
  target: ConvertTarget
  spreadProps?: boolean
  titleProp?: boolean
}

interface ConvertInternalResult extends ConvertResult {
  /** True when the root is an SVG, so the title prop went into the output. */
  titleApplied: boolean
}

function convert(html: string, options: ConvertInternalOptions): ConvertInternalResult {
  const input = html.trim()
  if (!input) {
    return { code: '', notes: [], titleApplied: false }
  }

  const parser = getParser()
  if (!parser) {
    return { code: '', notes: [], titleApplied: false }
  }

  const doc = parser.parseFromString(input, 'text/html')
  const notes: ConvertNote[] = []

  if (doc.doctype) {
    notes.push({ kind: 'doctype', detail: `<!DOCTYPE ${doc.doctype.name}>` })
  }

  // A leading <style>, <title>, or <meta> lands in the head, so read both.
  const roots = [...Array.from(doc.head.childNodes), ...Array.from(doc.body.childNodes)]
  const elementRoots = roots.filter(node => node.nodeType === ELEMENT_NODE) as Element[]
  // The props spread and the title prop belong to the first root of the body.
  const firstRoot = elementRoots.find(element => element.parentElement === doc.body)
    ?? elementRoots[0]
    ?? null

  const renames = new Map<Element | null, Map<string, string>>()
  const ids = new Map<Element, string>()
  collectIds(roots, new Set<string>(), renames, ids, null)

  const isSvgRoot = firstRoot?.localName === 'svg'
  const ctx: WalkContext = {
    target: options.target,
    notes,
    titleRoot: options.titleProp && isSvgRoot ? firstRoot : null,
  }

  const extraAttrs = options.spreadProps ? '{...props}' : ''
  const prepend = ctx.titleRoot ? '\n  {title ? <title>{title}</title> : null}' : ''
  const baseRefs = renames.get(null) ?? new Map<string, string>()

  const code = roots
    .map((node) => {
      const isFirst = node === firstRoot
      return serializeNode(
        node,
        ctx,
        baseRefs,
        renames,
        ids,
        isFirst ? extraAttrs : '',
        isFirst ? prepend : '',
      )
    })
    .join('')

  const needsFragment = options.target === 'jsx' && elementRoots.length > 1

  return {
    code: needsFragment ? `<>${code}</>` : code,
    notes,
    titleApplied: ctx.titleRoot !== null,
  }
}

export function convertHtmlToJsx(html: string, options: JsxConvertOptions = {}): ConvertResult {
  const { code, notes, titleApplied } = convert(html, {
    target: 'jsx',
    spreadProps: options.wrapComponent && options.spreadProps,
    titleProp: options.wrapComponent && options.titleProp,
  })

  if (!code || !options.wrapComponent) {
    return { code, notes }
  }

  const name = options.componentName?.trim() || 'MyComponent'
  const indented = code
    .split('\n')
    .map(line => (line ? `    ${line}` : ''))
    .join('\n')

  // Only an SVG root gets the title element, so a different root takes no title parameter.
  const params = titleApplied
    ? (options.spreadProps ? '{ title, ...props }' : '{ title }')
    : (options.spreadProps ? 'props' : '')

  return {
    code: `export default function ${name}(${params}) {\n  return (\n${indented}\n  );\n}`,
    notes,
  }
}

export function convertHtmlToVue(html: string, options: VueConvertOptions = {}): ConvertResult {
  const { code, notes } = convert(html, { target: 'vue' })

  if (!code || !options.wrapSfc) {
    return { code, notes }
  }

  const indented = code
    .split('\n')
    .map(line => (line ? `  ${line}` : ''))
    .join('\n')

  return {
    code: `<script setup lang="ts">\n// Component logic\n</script>\n\n<template>\n${indented}\n</template>\n`,
    notes,
  }
}
