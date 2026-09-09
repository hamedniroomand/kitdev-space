import { gzipSync } from 'fflate'
import { formatJson, minifyJson } from '../data/json'

/** The languages the server route accepts. The route minifies JavaScript and TypeScript. */
export type CodeLanguage = 'javascript' | 'typescript' | 'html' | 'css' | 'json'

/** Every language of the tool page. The extra languages format in the browser only. */
export type FormatLanguage = CodeLanguage | 'vue' | 'scss' | 'markdown' | 'yaml' | 'graphql' | 'sql'

export type CodeAction = 'minify' | 'beautify'

/** The indentation and the quote choice of the user. */
export interface FormatStyle {
  tabWidth: number
  useTabs: boolean
  singleQuote: boolean
}

export const DEFAULT_FORMAT_STYLE: FormatStyle = {
  tabWidth: 2,
  useTabs: false,
  singleQuote: false,
}

export const MAX_INPUT_CHARS = 500_000

export const LANGUAGE_EXTENSIONS: Record<FormatLanguage, string> = {
  javascript: 'js',
  typescript: 'ts',
  html: 'html',
  vue: 'vue',
  css: 'css',
  scss: 'scss',
  json: 'json',
  markdown: 'md',
  yaml: 'yaml',
  graphql: 'graphql',
  sql: 'sql',
}

const LANGUAGES = new Set<CodeLanguage>(['javascript', 'typescript', 'html', 'css', 'json'])
const ACTIONS = new Set<CodeAction>(['minify', 'beautify'])
const MINIFY_LANGUAGES = new Set<FormatLanguage>(['javascript', 'typescript', 'html', 'css', 'json'])

export function isCodeLanguage(value: string): value is CodeLanguage {
  return LANGUAGES.has(value as CodeLanguage)
}

export function isCodeAction(value: string): value is CodeAction {
  return ACTIONS.has(value as CodeAction)
}

/** True when the tool can compress the language. The other languages only format. */
export function canMinify(language: FormatLanguage): boolean {
  return MINIFY_LANGUAGES.has(language)
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

const ACTION_SUFFIX: Record<CodeAction, string> = { minify: 'min', beautify: 'pretty' }
const ACTION_FALLBACK: Record<CodeAction, string> = { minify: 'minified', beautify: 'formatted' }

/**
 * The name of the download file. `app.js` becomes `app.min.js` for minify and
 * `app.min.js` becomes `app.pretty.js` for beautify. A name with no extension
 * gets the extension of the language.
 */
export function downloadFileName(
  sourceName: string | null | undefined,
  action: CodeAction,
  extension: string,
): string {
  const name = (sourceName ?? '').trim()
  if (!name) {
    return `${ACTION_FALLBACK[action]}.${extension}`
  }

  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot + 1) : extension
  const base = stem.replace(/\.(min|pretty)$/i, '')
  return `${base}.${ACTION_SUFFIX[action]}.${ext}`
}

export interface ByteDelta {
  inputBytes: number
  outputBytes: number
  gzipBytes: number
  /** Positive when the output is smaller than the input. */
  reductionPercent: number
}

/** The exact byte counts of one run. Gzip runs over the encoded output. */
export function measureBytes(input: string, output: string): ByteDelta {
  const encoder = new TextEncoder()
  const inputBytes = encoder.encode(input).length
  const encoded = encoder.encode(output)
  const outputBytes = encoded.length

  return {
    inputBytes,
    outputBytes,
    gzipBytes: outputBytes === 0 ? 0 : gzipSync(encoded).length,
    reductionPercent: inputBytes === 0
      ? 0
      : Math.round(((inputBytes - outputBytes) / inputBytes) * 100),
  }
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

const PLUGIN_IMPORTS = {
  babel: () => import('prettier/plugins/babel'),
  estree: () => import('prettier/plugins/estree'),
  graphql: () => import('prettier/plugins/graphql'),
  html: () => import('prettier/plugins/html'),
  markdown: () => import('prettier/plugins/markdown'),
  postcss: () => import('prettier/plugins/postcss'),
  typescript: () => import('prettier/plugins/typescript'),
  yaml: () => import('prettier/plugins/yaml'),
}

type PluginName = keyof typeof PLUGIN_IMPORTS

/** The Prettier parser and the plugins of each language. JSON and SQL use other tools. */
const PRETTIER_LANGUAGES: Record<Exclude<FormatLanguage, 'json' | 'sql'>, {
  parser: string
  plugins: PluginName[]
}> = {
  javascript: { parser: 'babel', plugins: ['babel', 'estree'] },
  typescript: { parser: 'typescript', plugins: ['typescript', 'estree'] },
  html: { parser: 'html', plugins: ['html'] },
  vue: { parser: 'vue', plugins: ['html', 'postcss', 'babel', 'estree'] },
  css: { parser: 'css', plugins: ['postcss'] },
  scss: { parser: 'scss', plugins: ['postcss'] },
  markdown: { parser: 'markdown', plugins: ['markdown'] },
  yaml: { parser: 'yaml', plugins: ['yaml'] },
  graphql: { parser: 'graphql', plugins: ['graphql'] },
}

async function loadPlugin(name: PluginName) {
  const mod = await PLUGIN_IMPORTS[name]()
  return (mod as { default?: unknown }).default ?? mod
}

/** SQL is not a Prettier language, so it uses sql-formatter. */
async function beautifySql(code: string, style: FormatStyle): Promise<string> {
  const { format } = await import('sql-formatter')
  try {
    return format(code, {
      language: 'sql',
      tabWidth: style.tabWidth,
      useTabs: style.useTabs,
    })
  }
  catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Format failed.'
    throw new Error(`Syntax error.\n\n${message}`, { cause })
  }
}

/**
 * Formats code in the browser with `prettier/standalone`. Each parser plugin
 * loads on demand, so a page downloads only the plugins of the language that
 * the user selects.
 */
export async function beautifyInBrowser(
  code: string,
  language: FormatLanguage,
  style: FormatStyle = DEFAULT_FORMAT_STYLE,
): Promise<string> {
  const text = requireCodeInput(code)

  if (language === 'json') {
    return formatJson(text, style.useTabs ? 'tab' : style.tabWidth)
  }
  if (language === 'sql') {
    return beautifySql(text, style)
  }

  const { parser, plugins } = PRETTIER_LANGUAGES[language]
  const [{ format }, loaded] = await Promise.all([
    import('prettier/standalone'),
    Promise.all(plugins.map(loadPlugin)),
  ])

  try {
    return await format(text, {
      parser,
      plugins: loaded as never[],
      printWidth: 80,
      tabWidth: style.tabWidth,
      useTabs: style.useTabs,
      semi: true,
      singleQuote: style.singleQuote,
    })
  }
  catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Format failed.'
    throw new Error(`Syntax error.\n\n${message}`, { cause })
  }
}

export function canFormatInBrowser(language: FormatLanguage, action: CodeAction): boolean {
  if (action === 'beautify') {
    return true
  }
  return language === 'json' || language === 'html' || language === 'css'
}

function beautifyEngine(language: FormatLanguage): string {
  if (language === 'json') {
    return 'json'
  }
  return language === 'sql' ? 'sql-formatter' : 'prettier'
}

export async function formatInBrowser(
  code: string,
  language: FormatLanguage,
  action: CodeAction,
  style: FormatStyle = DEFAULT_FORMAT_STYLE,
): Promise<{ code: string, engine: string }> {
  const text = requireCodeInput(code)

  if (action === 'beautify') {
    return {
      code: await beautifyInBrowser(text, language, style),
      engine: beautifyEngine(language),
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
