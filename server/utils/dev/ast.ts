import { parseSync } from 'oxc-parser'
import { ResolverFactory } from 'oxc-resolver'
import { transformSync } from 'oxc-transform'
import {
  buildAstTree,
  collectImportSpecifiers,
  languageToFilename,
  type AstLanguage,
  type AstTreeNode,
  type ResolveMode
} from '../../../shared/utils/dev/ast'

const MAX_INPUT_CHARS = 200_000

export type { AstLanguage, ResolveMode }

const LANGUAGES = new Set<AstLanguage>(['javascript', 'jsx', 'typescript', 'tsx'])
const RESOLVE_MODES = new Set<ResolveMode>(['esm', 'node'])

export function isAstLanguage(value: string): value is AstLanguage {
  return LANGUAGES.has(value as AstLanguage)
}

export function isResolveMode(value: string): value is ResolveMode {
  return RESOLVE_MODES.has(value as ResolveMode)
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

export interface AstParseResult {
  language: AstLanguage
  filename: string
  tree: AstTreeNode
  program: unknown
  imports: string[]
  errors: { message: string, codeframe?: string | null }[]
  comments: unknown[]
}

export function parseSourceAst(code: string, language: AstLanguage): AstParseResult {
  if (!isAstLanguage(language)) {
    throw new Error('Choose a valid language.')
  }

  const source = requireInput(code)
  const filename = languageToFilename(language)
  const lang = language === 'javascript'
    ? 'js'
    : language === 'typescript'
      ? 'ts'
      : language

  const parsed = parseSync(filename, source, {
    lang,
    sourceType: 'module',
    range: true
  })

  const errors = (parsed.errors ?? []).map(error => ({
    message: error.message,
    codeframe: error.codeframe ?? null
  }))

  if (!parsed.program) {
    throw new Error(errors[0]?.message || 'Parse failed.')
  }

  const tree = buildAstTree(parsed.program, source)
  if (!tree) {
    throw new Error('Could not build the AST tree.')
  }

  return {
    language,
    filename,
    tree,
    program: parsed.program,
    imports: collectImportSpecifiers(parsed.program),
    errors,
    comments: parsed.comments ?? []
  }
}

export interface AstTransformResult {
  code: string
  errors: { message: string }[]
  helpersUsed: unknown
}

export function transformSourceAst(code: string, language: AstLanguage): AstTransformResult {
  const source = requireInput(code)
  const filename = languageToFilename(language)

  const result = transformSync(filename, source, {
    typescript: {
      onlyRemoveTypeImports: false
    },
    jsx: {
      runtime: 'automatic'
    }
  })

  return {
    code: result.code,
    errors: (result.errors ?? []).map(error => ({
      message: typeof error === 'string' ? error : (error as { message?: string }).message || 'Transform error.'
    })),
    helpersUsed: result.helpersUsed
  }
}

export interface ResolveResultItem {
  specifier: string
  ok: boolean
  path: string | null
  error: string | null
  packageJsonPath: string | null
}

function createResolver(mode: ResolveMode): ResolverFactory {
  const conditionNames = mode === 'esm'
    ? ['import', 'module', 'node', 'default']
    : ['require', 'node', 'default']

  return new ResolverFactory({
    extensions: ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.json', '.node'],
    conditionNames,
    mainFields: mode === 'esm' ? ['module', 'main'] : ['main', 'module'],
    exportsFields: ['exports'],
    modules: ['node_modules']
  })
}

export function resolveSpecifiers(input: {
  directory?: string
  mode?: ResolveMode
  specifiers: string[]
}): ResolveResultItem[] {
  const mode = input.mode ?? 'esm'
  if (!isResolveMode(mode)) {
    throw new Error('Choose esm or node resolve mode.')
  }

  const directory = input.directory?.trim() || process.cwd()
  const resolver = createResolver(mode)
  const unique = [...new Set(input.specifiers.map(item => item.trim()).filter(Boolean))]

  if (unique.length === 0) {
    throw new Error('Enter at least one module specifier.')
  }

  return unique.map((specifier) => {
    const result = resolver.sync(directory, specifier) as {
      path?: string
      error?: string
      packageJsonPath?: string
    }

    if (result.error || !result.path) {
      return {
        specifier,
        ok: false,
        path: null,
        error: result.error || 'Resolve failed.',
        packageJsonPath: null
      }
    }

    return {
      specifier,
      ok: true,
      path: result.path,
      error: null,
      packageJsonPath: result.packageJsonPath ?? null
    }
  })
}
