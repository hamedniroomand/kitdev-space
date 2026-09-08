import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: false,
})

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** A relative path, a fragment, or a scheme that cannot run script. */
const SAFE_SCHEME = /^(?:https?:|mailto:|tel:|#|\/|\.{1,2}\/|[^:]*$)/i

/** Whitespace and control characters, which can hide a scheme from a check. */
const HIDDEN_CHARS = /[\s\p{Cc}]/gu

/**
 * Keep only targets that cannot run script. `javascript:` and `data:` in an
 * `href` or `src` run on click or on load. A browser also reads a tab or a
 * newline inside `java\tscript:` as nothing, so remove hidden characters
 * before the scheme check.
 */
function safeUrl(href: string): string | null {
  const value = href.replace(HIDDEN_CHARS, '')
  return SAFE_SCHEME.test(value) ? value : null
}

export interface MarkdownHeadingItem {
  level: number
  text: string
  slug: string
  line: number
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'heading'
}

let headingSlugCounts = new Map<string, number>()

interface ImageAttributes {
  src: string
  alt?: string
  title?: string
  width?: string
  height?: string
  loading?: 'lazy' | 'eager'
}

function parseImageAttributes(raw: string): ImageAttributes | null {
  let i = 0
  const len = raw.length
  let src: string | null = null
  let alt: string | undefined
  let title: string | undefined
  let width: string | undefined
  let height: string | undefined
  let loading: 'lazy' | 'eager' | undefined

  while (i < len) {
    while (i < len && (raw.charCodeAt(i) <= 32 || raw[i] === '/')) {
      i++
    }
    if (i >= len) {
      break
    }

    const nameStart = i
    while (i < len && raw[i] !== '=' && raw.charCodeAt(i) > 32 && raw[i] !== '/' && raw[i] !== '>') {
      i++
    }
    const attrName = raw.slice(nameStart, i).toLowerCase()

    while (i < len && raw.charCodeAt(i) <= 32) {
      i++
    }

    let attrValue = ''
    if (i < len && raw[i] === '=') {
      i++
      while (i < len && raw.charCodeAt(i) <= 32) {
        i++
      }
      if (i < len) {
        const quote = raw[i]
        if (quote === '"' || quote === '\'') {
          i++
          const valStart = i
          while (i < len && raw[i] !== quote) {
            i++
          }
          attrValue = raw.slice(valStart, i)
          if (i < len) {
            i++
          }
        }
        else {
          const valStart = i
          while (i < len && raw.charCodeAt(i) > 32 && raw[i] !== '>') {
            i++
          }
          attrValue = raw.slice(valStart, i)
        }
      }
    }

    if (attrName === 'src') {
      const validated = safeUrl(attrValue)
      if (!validated) {
        return null
      }
      src = validated
    }
    else if (attrName === 'alt') {
      alt = attrValue
    }
    else if (attrName === 'title') {
      title = attrValue
    }
    else if (attrName === 'width') {
      if (!/^\d+(?:px|%)?$/i.test(attrValue)) {
        return null
      }
      width = attrValue
    }
    else if (attrName === 'height') {
      if (!/^\d+(?:px|%)?$/i.test(attrValue)) {
        return null
      }
      height = attrValue
    }
    else if (attrName === 'loading') {
      if (attrValue !== 'lazy' && attrValue !== 'eager') {
        return null
      }
      loading = attrValue
    }
    else {
      return null
    }
  }

  if (!src) {
    return null
  }
  return { src, alt, title, width, height, loading }
}

function sanitizeHtmlTag(fullTag: string): string {
  const isClosing = fullTag.startsWith('</')
  const inside = fullTag.slice(isClosing ? 2 : 1, -1).trim()
  const spaceIdx = inside.search(/\s/)
  const tagName = (spaceIdx === -1 ? inside : inside.slice(0, spaceIdx)).replace(/\/$/, '').toLowerCase()
  const rawAttrs = spaceIdx === -1 ? '' : inside.slice(spaceIdx).trim()

  if (isClosing) {
    if (['details', 'summary', 'kbd'].includes(tagName) && !rawAttrs) {
      return `</${tagName}>`
    }
    return escapeHtml(fullTag)
  }

  if (tagName === 'details') {
    if (!rawAttrs) {
      return '<details>'
    }
    if (rawAttrs.toLowerCase() === 'open') {
      return '<details open>'
    }
    return escapeHtml(fullTag)
  }

  if (tagName === 'summary') {
    if (!rawAttrs) {
      return '<summary>'
    }
    return escapeHtml(fullTag)
  }

  if (tagName === 'kbd') {
    if (!rawAttrs) {
      return '<kbd>'
    }
    return escapeHtml(fullTag)
  }

  if (tagName === 'img') {
    const parsed = parseImageAttributes(rawAttrs)
    if (!parsed) {
      return escapeHtml(fullTag)
    }
    let tag = `<img src="${escapeHtml(parsed.src)}"`
    if (parsed.alt !== undefined) {
      tag += ` alt="${escapeHtml(parsed.alt)}"`
    }
    if (parsed.title !== undefined) {
      tag += ` title="${escapeHtml(parsed.title)}"`
    }
    if (parsed.width !== undefined) {
      tag += ` width="${escapeHtml(parsed.width)}"`
    }
    if (parsed.height !== undefined) {
      tag += ` height="${escapeHtml(parsed.height)}"`
    }
    if (parsed.loading !== undefined) {
      tag += ` loading="${escapeHtml(parsed.loading)}"`
    }
    tag += '>'
    return tag
  }

  return escapeHtml(fullTag)
}

export function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') {
    return ''
  }
  return rawHtml.replace(/<\/?[a-z0-9-][^>]*>/gi, match => sanitizeHtmlTag(match))
}

/**
 * `marked` passes raw HTML in the source straight through, and the preview
 * renders the result with `v-html`. Escape dangerous HTML and scripts,
 * allow verified safe tags (details, summary, kbd, img), and drop link and
 * image targets that carry an executable scheme.
 */
marked.use({
  hooks: {
    preprocess(markdown) {
      headingSlugCounts = new Map()
      return markdown
    },
  },
  renderer: {
    html({ text }: { text: string }): string {
      return sanitizeHtml(text)
    },

    heading({ tokens, depth }): string {
      const text = this.parser.parseInline(tokens)
      const plainText = text.replace(/<[^>]+>/g, '').replace(/[*_`~]/g, '').trim()
      const baseSlug = slugifyHeading(plainText)
      const count = headingSlugCounts.get(baseSlug) ?? 0
      headingSlugCounts.set(baseSlug, count + 1)
      const slug = count === 0 ? baseSlug : `${baseSlug}-${count}`
      return `<h${depth} id="${slug}">${text}</h${depth}>\n`
    },

    link({ href, title, tokens }): string {
      const text = this.parser.parseInline(tokens)
      const url = safeUrl(href)
      if (url === null) {
        return text
      }
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : ''
      return `<a href="${escapeHtml(url)}"${titleAttr} rel="nofollow noopener noreferrer">${text}</a>`
    },

    image({ href, title, text }): string {
      const url = safeUrl(href)
      if (url === null) {
        return escapeHtml(text)
      }
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : ''
      return `<img src="${escapeHtml(url)}" alt="${escapeHtml(text)}"${titleAttr}>`
    },
  },
})

export interface MarkdownParseOptions {
  breaks?: boolean
  gfm?: boolean
}

export function parseMarkdown(input: string, options?: MarkdownParseOptions): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  try {
    return marked.parse(input, {
      async: false,
      breaks: options?.breaks ?? false,
      gfm: options?.gfm ?? true,
    }) as string
  }
  catch {
    return ''
  }
}

export function extractMarkdownHeading(markdown: string): string | null {
  if (!markdown || typeof markdown !== 'string') {
    return null
  }
  const lines = markdown.split(/\r?\n/)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line.startsWith('#') && !line.startsWith('##')) {
      const heading = line
        .replace(/^#+\s*/, '')
        .replace(/\s+#+$/, '')
        .replace(/[*_`~]/g, '')
        .trim()
      if (heading) {
        return heading
      }
    }
  }
  return null
}

export function extractMarkdownHeadings(markdown: string): MarkdownHeadingItem[] {
  if (!markdown || typeof markdown !== 'string') {
    return []
  }
  const lines = markdown.split(/\r?\n/)
  const headings: MarkdownHeadingItem[] = []
  const slugCounts = new Map<string, number>()
  let inCodeBlock = false

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]!
    const line = rawLine.trim()
    if (line.startsWith('```') || line.startsWith('~~~')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) {
      continue
    }

    const match = line.match(/^(#{1,6})\s+(\S.*)$/)
    if (match) {
      const level = match[1]!.length
      const rawText = match[2]!.replace(/#+$/, '').trim()
      const cleanText = rawText.replace(/[*_`~]/g, '').trim()
      if (!cleanText) {
        continue
      }
      const baseSlug = slugifyHeading(cleanText)
      const count = slugCounts.get(baseSlug) ?? 0
      slugCounts.set(baseSlug, count + 1)
      const slug = count === 0 ? baseSlug : `${baseSlug}-${count}`

      headings.push({
        level,
        text: cleanText,
        slug,
        line: i + 1,
      })
    }
  }

  return headings
}

export function deriveMarkdownFilename(
  markdown: string,
  extension = 'html',
  defaultName = 'document',
): string {
  const heading = extractMarkdownHeading(markdown)
  const ext = extension.startsWith('.') ? extension : `.${extension}`
  if (!heading) {
    return `${defaultName}${ext}`
  }
  const slug = heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return `${slug || defaultName}${ext}`
}

export function generateHtmlDocument(bodyHtml: string, title = 'Markdown Document'): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    :root {
      color-scheme: light dark;
      --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      --bg: #ffffff;
      --fg: #1e293b;
      --border: #e2e8f0;
      --code-bg: #f1f5f9;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0f172a;
        --fg: #f8fafc;
        --border: #334155;
        --code-bg: #1e293b;
      }
    }
    body {
      font-family: var(--font-sans);
      color: var(--fg);
      background: var(--bg);
      line-height: 1.6;
      margin: 0;
      padding: 2rem 1.5rem;
      max-width: 800px;
      margin-inline: auto;
    }
    h1, h2, h3, h4, h5, h6 { line-height: 1.25; margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 600; }
    h1 { font-size: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
    h2 { font-size: 1.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
    p, ul, ol, table, blockquote, pre { margin-top: 0; margin-bottom: 1rem; }
    code { font-family: var(--font-mono); background: var(--code-bg); padding: 0.2em 0.4em; border-radius: 4px; font-size: 0.875em; }
    pre { background: var(--code-bg); padding: 1rem; border-radius: 6px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid var(--border); padding-left: 1rem; color: #64748b; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
    th, td { border: 1px solid var(--border); padding: 0.5rem 0.75rem; text-align: left; }
    th { background: var(--code-bg); font-weight: 600; }
    hr { border: 0; border-top: 1px solid var(--border); margin: 2rem 0; }
    input[type="checkbox"] { margin-right: 0.5em; }
    kbd { font-family: var(--font-mono); background: var(--code-bg); border: 1px solid var(--border); border-radius: 4px; padding: 0.1em 0.35em; font-size: 0.85em; }
    details { border: 1px solid var(--border); border-radius: 6px; padding: 0.5rem 0.75rem; margin-bottom: 1rem; }
    summary { font-weight: 600; cursor: pointer; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`
}
