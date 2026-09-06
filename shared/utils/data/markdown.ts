import { marked } from 'marked'

export interface MarkdownStats {
  characters: number
  words: number
  readingTime: string
}

marked.setOptions({
  gfm: true,
  breaks: true
})

export function parseMarkdown(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  try {
    return marked.parse(input, { async: false }) as string
  } catch {
    return ''
  }
}

export function getMarkdownStats(text: string): MarkdownStats {
  const characters = text.length
  const trimmed = text.trim()
  const words = trimmed ? trimmed.split(/\s+/).length : 0

  const minutes = Math.ceil(words / 200)
  const readingTime = words === 0 || minutes <= 1
    ? '< 1 min read'
    : `${minutes} min read`

  return {
    characters,
    words,
    readingTime
  }
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
