import { minify as minifyCssWithCsso } from 'csso'
import { minifySync } from 'oxc-minify'
import prettier from 'prettier'
import { formatJson, minifyJson } from '../../../shared/utils/data/json'

export type CodeLanguage = 'javascript' | 'typescript' | 'html' | 'css' | 'json'
export type CodeAction = 'minify' | 'beautify'

const MAX_INPUT_CHARS = 500_000

const LANGUAGES = new Set<CodeLanguage>(['javascript', 'typescript', 'html', 'css', 'json'])
const ACTIONS = new Set<CodeAction>(['minify', 'beautify'])

export function isCodeLanguage(value: string): value is CodeLanguage {
  return LANGUAGES.has(value as CodeLanguage)
}

export function isCodeAction(value: string): value is CodeAction {
  return ACTIONS.has(value as CodeAction)
}

function requireInput(code: string): string {
  const text = code ?? ''
  if (!text.trim()) {
    throw new Error('Enter source code before you run the tool.')
  }
  if (text.length > MAX_INPUT_CHARS) {
    throw new Error('Input is too large.')
  }
  return text
}

function stripTypes(code: string, loader: 'ts' | 'tsx' | 'js' | 'jsx'): string {
  try {
    return new Bun.Transpiler({ loader }).transformSync(code)
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Parse failed.'
    throw new Error(`Syntax error.\n\n${message}`, { cause })
  }
}

function minifyJsTs(code: string, language: 'javascript' | 'typescript'): string {
  const source = language === 'typescript'
    ? stripTypes(code, 'ts')
    : code

  try {
    const result = minifySync('input.js', source, {
      compress: {
        target: 'esnext'
      },
      mangle: {
        toplevel: true
      },
      codegen: {
        removeWhitespace: true
      }
    })
    return result.code
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Minify failed.'
    throw new Error(`Syntax error.\n\n${message}`, { cause })
  }
}

async function beautifyWithPrettier(code: string, language: CodeLanguage): Promise<string> {
  const parser = language === 'javascript'
    ? 'babel'
    : language === 'typescript'
      ? 'typescript'
      : language

  try {
    return await prettier.format(code, {
      parser,
      printWidth: 80,
      tabWidth: 2,
      semi: true,
      singleQuote: false
    })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Format failed.'
    throw new Error(`Syntax error.\n\n${message}`, { cause })
  }
}

// ponytail: Simple HTML minify strips comments and collapses tag whitespace.
// A later phase can use a dedicated HTML minifier for attribute-safe output.
function minifyHtml(code: string): string {
  return code
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function minifyCss(code: string): string {
  try {
    return minifyCssWithCsso(code).css
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'CSS minify failed.'
    throw new Error(`Syntax error.\n\n${message}`, { cause })
  }
}

export async function processCode(
  code: string,
  language: CodeLanguage,
  action: CodeAction
): Promise<{ code: string, engine: string }> {
  if (!isCodeLanguage(language)) {
    throw new Error('Choose a valid language.')
  }
  if (!isCodeAction(action)) {
    throw new Error('Choose minify or beautify.')
  }

  const text = requireInput(code)

  if (action === 'beautify') {
    if (language === 'json') {
      return { code: formatJson(text), engine: 'json' }
    }
    return {
      code: await beautifyWithPrettier(text, language),
      engine: 'prettier'
    }
  }

  switch (language) {
    case 'javascript':
    case 'typescript':
      return { code: minifyJsTs(text, language), engine: 'oxc-minify' }
    case 'html':
      return { code: minifyHtml(text), engine: 'html' }
    case 'css':
      return { code: minifyCss(text), engine: 'csso' }
    case 'json':
      return { code: minifyJson(text), engine: 'json' }
  }
}
