import { DataError } from './errors'

/**
 * XML in the browser with `DOMParser` and no library.
 *
 * The JSON shape: an element is a key, repeated siblings are an array, an
 * attribute is an `@name` key, and text next to attributes or child elements
 * is `#text`. XML has no types, so every value is a string.
 *
 * The XML shape: a non-object value or an object with several top-level keys
 * gets a `<root>` wrapper. A key that is not a valid XML name is written as
 * `<item key="…">`, so any JSON object round-trips.
 */

const XML_NAME = /^[A-Z_][\w.-]*$/i

export function isXmlElementName(name: string): boolean {
  return !name.startsWith('@') && !name.startsWith('#') && XML_NAME.test(name)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** An `@` key is an attribute only when the rest is a valid XML name. `@nuxt/ui` is a JSON key, not an attribute. */
function attributeName(key: string): string | null {
  const name = key.startsWith('@') ? key.slice(1) : ''
  return name && XML_NAME.test(name) ? name : null
}

function getParser(): DOMParser {
  // Some DOM environments bind the class to their window, so read it from there when it exists.
  const Parser = (globalThis as { window?: { DOMParser?: typeof DOMParser } }).window?.DOMParser
    ?? (typeof DOMParser === 'undefined' ? undefined : DOMParser)
  if (!Parser) {
    throw new DataError('XML needs a browser.')
  }
  return new Parser()
}

// ---------- XML -> JSON ----------

export interface ParseXmlOptions {
  strict?: boolean
}

function elementToValue(
  element: Element,
  options: ParseXmlOptions = {},
  parentNamespaces: Map<string, string> = new Map(),
): unknown {
  const currentNamespaces = new Map(parentNamespaces)
  for (const attribute of Array.from(element.attributes)) {
    if (attribute.name === 'xmlns' || attribute.name.startsWith('xmlns:')) {
      const prefix = attribute.name === 'xmlns' ? '' : attribute.name.slice(6)
      const uri = attribute.value
      if (options.strict && parentNamespaces.has(prefix)) {
        const existingUri = parentNamespaces.get(prefix)
        if (existingUri && existingUri !== uri) {
          throw new DataError(
            `Namespace prefix "${prefix || 'default'}" in element <${element.nodeName}> has conflicting URIs: "${existingUri}" and "${uri}".`,
          )
        }
      }
      currentNamespaces.set(prefix, uri)
    }
  }

  const out: Record<string, unknown> = {}
  const seenAttributeNames = new Set<string>()

  for (const attribute of Array.from(element.attributes)) {
    if (options.strict) {
      if (seenAttributeNames.has(attribute.name)) {
        throw new DataError(`Conflicting attribute name "${attribute.name}" in element <${element.nodeName}>.`)
      }
      seenAttributeNames.add(attribute.name)
    }
    out[`@${attribute.name}`] = attribute.value
  }

  let text = ''
  let hasElementChild = false
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === 1) {
      hasElementChild = true
      const child = node as Element
      const value = elementToValue(child, options, currentNamespaces)
      const existing = out[child.nodeName]
      if (existing === undefined) {
        out[child.nodeName] = value
      }
      else if (Array.isArray(existing)) {
        existing.push(value)
      }
      else {
        out[child.nodeName] = [existing, value]
      }
    }
    else if (node.nodeType === 3 || node.nodeType === 4) {
      // Text and CDATA. Comments and processing instructions are dropped.
      text += node.nodeValue ?? ''
    }
  }

  const trimmed = text.trim()
  const hasAttributes = element.attributes.length > 0

  if (options.strict && hasElementChild && trimmed.length > 0) {
    throw new DataError(
      `Cannot convert mixed content in element <${element.nodeName}> to JSON.\n\nThe element contains both text and child elements.`,
    )
  }

  if (!hasElementChild && !hasAttributes) {
    return trimmed
  }
  if (trimmed) {
    out['#text'] = trimmed
  }
  return out
}

export function parseXml(text: string, options: ParseXmlOptions = {}): unknown {
  const document = getParser().parseFromString(text, 'application/xml')
  const failure = document.querySelector('parsererror')
  if (failure) {
    const detail = failure.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    throw new DataError(`Invalid XML.\n\n${detail || 'Check the syntax and try again.'}`)
  }
  const root = document.documentElement
  if (!root) {
    throw new DataError('Invalid XML.\n\nThe document has no root element.')
  }
  return { [root.nodeName]: elementToValue(root, options) }
}

// ---------- JSON -> XML ----------

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeAttribute(value: string): string {
  return escapeText(value).replace(/"/g, '&quot;')
}

function scalarText(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  return typeof value === 'string' ? value : String(value)
}

/** Writes one element. `attributes` come from `@` keys and from an invalid key wrapped as `<item key>`. */
function writeElement(name: string, value: unknown, indent: string, attributes: Record<string, string> = {}): string[] {
  const lines: string[] = []
  const attributeText = Object.entries(attributes)
    .map(([key, attributeValue]) => ` ${key}="${escapeAttribute(attributeValue)}"`)
    .join('')

  if (Array.isArray(value)) {
    for (const item of value) {
      lines.push(...writeElement(name, item, indent, attributes))
    }
    return lines
  }

  if (!isPlainObject(value)) {
    const text = scalarText(value)
    lines.push(text === '' ? `${indent}<${name}${attributeText}/>` : `${indent}<${name}${attributeText}>${escapeText(text)}</${name}>`)
    return lines
  }

  const ownAttributes = { ...attributes }
  let text: string | null = null
  const children: [string, unknown][] = []
  for (const [key, child] of Object.entries(value)) {
    const attribute = attributeName(key)
    if (attribute) {
      ownAttributes[attribute] = scalarText(child)
    }
    else if (key === '#text') {
      text = scalarText(child)
    }
    else {
      children.push([key, child])
    }
  }
  const ownAttributeText = Object.entries(ownAttributes)
    .map(([key, attributeValue]) => ` ${key}="${escapeAttribute(attributeValue)}"`)
    .join('')

  if (!children.length) {
    lines.push(text ? `${indent}<${name}${ownAttributeText}>${escapeText(text)}</${name}>` : `${indent}<${name}${ownAttributeText}/>`)
    return lines
  }

  lines.push(`${indent}<${name}${ownAttributeText}>`)
  if (text) {
    lines.push(`${indent}  ${escapeText(text)}`)
  }
  for (const [key, child] of children) {
    if (isXmlElementName(key)) {
      lines.push(...writeElement(key, child, `${indent}  `))
    }
    else {
      lines.push(...writeElement('item', child, `${indent}  `, { key }))
    }
  }
  lines.push(`${indent}</${name}>`)
  return lines
}

export function stringifyXml(value: unknown): string {
  if (Array.isArray(value)) {
    throw new DataError('XML needs an object root.\n\nWrap the array in an object first.')
  }

  let rootName = 'root'
  let rootValue: unknown = value
  if (isPlainObject(value)) {
    const keys = Object.keys(value)
    if (keys.length === 1 && isXmlElementName(keys[0]!) && (isPlainObject(value[keys[0]!]) || !Array.isArray(value[keys[0]!]))) {
      rootName = keys[0]!
      rootValue = value[rootName]
    }
  }

  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', ...writeElement(rootName, rootValue, '')]
  return `${lines.join('\n')}\n`
}
