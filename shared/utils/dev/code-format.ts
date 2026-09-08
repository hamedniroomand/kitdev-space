import { formatJson, minifyJson } from '../data/json'

export type CodeLanguage = 'javascript' | 'typescript' | 'html' | 'css' | 'json'
export type CodeAction = 'minify' | 'beautify'

export const MAX_INPUT_CHARS = 500_000

const LANGUAGES = new Set<CodeLanguage>(['javascript', 'typescript', 'html', 'css', 'json'])
const ACTIONS = new Set<CodeAction>(['minify', 'beautify'])

export function isCodeLanguage(value: string): value is CodeLanguage {
  return LANGUAGES.has(value as CodeLanguage)
}

export function isCodeAction(value: string): value is CodeAction {
  return ACTIONS.has(value as CodeAction)
}

export function requireCodeInput(code: string): string {
  const text = code ?? ''
  if (!text.trim()) {
    throw new Error('Enter source code before you run the tool.')
  }
  if (text.length > MAX_INPUT_CHARS) {
    throw new Error('Input is too large.')
  }
  return text
}

export function minifyHtml(code: string): string {
  const blocks: string[] = []
  const token = (i: number) => `<!--__BLOCK_${i}__-->`

  // Preserve contents of pre, textarea, script, and style blocks
  const preserved = code.replace(/<(pre|textarea|script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, (match) => {
    blocks.push(match)
    return token(blocks.length - 1)
  })

  let minified = preserved
    .replace(/<!--(?!__BLOCK_\d+__--)[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim()

  for (let i = 0; i < blocks.length; i++) {
    minified = minified.replace(token(i), blocks[i]!)
  }

  return minified
}

/** Loads csso only when the user asks for CSS minify. It adds about 150 KB. */
export async function minifyCss(code: string): Promise<string> {
  try {
    const { minify } = await import('csso')
    return minify(code).css
  }
  catch (cause) {
    const message = cause instanceof Error ? cause.message : 'CSS minify failed.'
    throw new Error(`Syntax error.\n\n${message}`, { cause })
  }
}

export async function beautifyInBrowser(code: string, language: CodeLanguage): Promise<string> {
  const text = requireCodeInput(code)
  if (language === 'json') {
    return formatJson(text)
  }

  const { format } = await import('prettier/standalone')
  let parser = 'babel'
  let plugins: any[] = []

  switch (language) {
    case 'javascript': {
      const [babel, estree] = await Promise.all([
        import('prettier/plugins/babel'),
        import('prettier/plugins/estree'),
      ])
      parser = 'babel'
      plugins = [babel.default ?? babel, estree.default ?? estree]
      break
    }
    case 'typescript': {
      const [typescript, estree] = await Promise.all([
        import('prettier/plugins/typescript'),
        import('prettier/plugins/estree'),
      ])
      parser = 'typescript'
      plugins = [typescript.default ?? typescript, estree.default ?? estree]
      break
    }
    case 'html': {
      const html = await import('prettier/plugins/html')
      parser = 'html'
      plugins = [html.default ?? html]
      break
    }
    case 'css': {
      const postcss = await import('prettier/plugins/postcss')
      parser = 'css'
      plugins = [postcss.default ?? postcss]
      break
    }
  }

  try {
    return await format(text, {
      parser,
      plugins,
      printWidth: 80,
      tabWidth: 2,
      semi: true,
      singleQuote: false,
    })
  }
  catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Format failed.'
    throw new Error(`Syntax error.\n\n${message}`, { cause })
  }
}

export function canFormatInBrowser(language: CodeLanguage, action: CodeAction): boolean {
  if (action === 'beautify') {
    return true
  }
  return language === 'json' || language === 'html' || language === 'css'
}

export async function formatInBrowser(
  code: string,
  language: CodeLanguage,
  action: CodeAction,
): Promise<{ code: string, engine: string }> {
  const text = requireCodeInput(code)

  if (action === 'beautify') {
    return {
      code: await beautifyInBrowser(text, language),
      engine: language === 'json' ? 'json' : 'prettier',
    }
  }

  if (language === 'json') {
    return {
      code: minifyJson(text),
      engine: 'json',
    }
  }
  if (language === 'html') {
    return { code: minifyHtml(text), engine: 'html' }
  }
  if (language === 'css') {
    return { code: await minifyCss(text), engine: 'csso' }
  }

  throw new Error('This language and action need the server.')
}
