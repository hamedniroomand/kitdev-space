import type { CodeAction, CodeLanguage } from '#shared/utils/dev/code-format'
import { minifySync } from 'oxc-minify'
import prettier from 'prettier'
import { formatJson, minifyJson } from '#shared/utils/data/json'
import {

  isCodeAction,
  isCodeLanguage,
  minifyCss,
  minifyHtml,
  requireCodeInput,
} from '#shared/utils/dev/code-format'

export { isCodeAction, isCodeLanguage }
export type { CodeAction, CodeLanguage }

function stripTypes(code: string, loader: 'ts' | 'tsx' | 'js' | 'jsx'): string {
  try {
    return new Bun.Transpiler({ loader }).transformSync(code)
  }
  catch (cause) {
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
        target: 'esnext',
      },
      mangle: {
        toplevel: true,
      },
      codegen: {
        removeWhitespace: true,
      },
    })
    return result.code
  }
  catch (cause) {
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
      singleQuote: false,
    })
  }
  catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Format failed.'
    throw new Error(`Syntax error.\n\n${message}`, { cause })
  }
}

export async function processCode(
  code: string,
  language: CodeLanguage,
  action: CodeAction,
): Promise<{ code: string, engine: string }> {
  if (!isCodeLanguage(language)) {
    throw new Error('Choose a valid language.')
  }
  if (!isCodeAction(action)) {
    throw new Error('Choose minify or beautify.')
  }

  const text = requireCodeInput(code)

  if (action === 'beautify') {
    if (language === 'json') {
      return { code: formatJson(text), engine: 'json' }
    }
    return {
      code: await beautifyWithPrettier(text, language),
      engine: 'prettier',
    }
  }

  switch (language) {
    case 'javascript':
    case 'typescript':
      return { code: minifyJsTs(text, language), engine: 'oxc-minify' }
    case 'html':
      return { code: minifyHtml(text), engine: 'html' }
    case 'css':
      return { code: await minifyCss(text), engine: 'csso' }
    case 'json':
      return { code: minifyJson(text), engine: 'json' }
  }
}
