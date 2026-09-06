import { formatJson, minifyJson } from '../data/json'

/**
 * Code formatting in the browser.
 *
 * JSON needs no library. HTML minify is a small regular expression. CSS minify
 * uses `csso`, an installed dependency that runs in the browser. Everything
 * else needs `Bun.Transpiler`, `oxc-minify`, or Prettier, so
 * `/api/dev/code-format` keeps that work.
 */

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

// ponytail: Simple HTML minify strips comments and collapses tag whitespace.
// A later phase can use a dedicated HTML minifier for attribute-safe output.
export function minifyHtml(code: string): string {
  return code
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Loads csso only when the user asks for CSS minify. It adds about 150 KB. */
export async function minifyCss(code: string): Promise<string> {
  try {
    const { minify } = await import('csso')
    return minify(code).css
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'CSS minify failed.'
    throw new Error(`Syntax error.\n\n${message}`, { cause })
  }
}

export function canFormatInBrowser(language: CodeLanguage, action: CodeAction): boolean {
  if (language === 'json') {
    return true
  }
  return action === 'minify' && (language === 'html' || language === 'css')
}

export async function formatInBrowser(
  code: string,
  language: CodeLanguage,
  action: CodeAction
): Promise<{ code: string, engine: string }> {
  if (!canFormatInBrowser(language, action)) {
    throw new Error('This language and action need the server.')
  }

  const text = requireCodeInput(code)

  if (language === 'json') {
    return {
      code: action === 'minify' ? minifyJson(text) : formatJson(text),
      engine: 'json'
    }
  }
  if (language === 'html') {
    return { code: minifyHtml(text), engine: 'html' }
  }
  return { code: await minifyCss(text), engine: 'csso' }
}
