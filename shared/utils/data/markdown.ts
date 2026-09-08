import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: true,
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

/**
 * `marked` passes raw HTML in the source straight through, and the preview
 * renders the result with `v-html`. Escape every HTML block and inline HTML
 * span so markup in the input shows as text and never runs, and drop link and
 * image targets that carry an executable scheme.
 */
marked.use({
  renderer: {
    html({ text }: { text: string }): string {
      return escapeHtml(text)
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

export function parseMarkdown(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  try {
    return marked.parse(input, { async: false }) as string
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
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`
}
