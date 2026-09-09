export type TranspileLoader = 'ts' | 'tsx' | 'js' | 'jsx'
export type NewSyntaxMode = 'compile' | 'keep'
export type JsxRuntime = 'classic' | 'automatic'

export interface TranspileOptions {
  /**
   * Sucrase has no ECMAScript target option. It compiles five newer syntax
   * features only: optional chaining, nullish coalescing, class fields,
   * numeric separators, and optional catch binding. `keep` leaves them.
   */
  newSyntax?: NewSyntaxMode
  jsxRuntime?: JsxRuntime
  /** Only the automatic runtime reads this. An empty value keeps `react`. */
  jsxImportSource?: string
}

const MAX_INPUT_CHARS = 500_000

export async function transpileSource(
  code: string,
  loader: TranspileLoader,
  options: TranspileOptions = {},
): Promise<{ code: string }> {
  const text = code ?? ''
  if (!text.trim()) {
    throw new Error('Enter source code before you run the tool.')
  }
  if (text.length > MAX_INPUT_CHARS) {
    throw new Error('Input is too large.')
  }

  const { transform } = await import('sucrase')

  const transforms: ('typescript' | 'jsx')[] = []
  if (loader === 'ts' || loader === 'tsx') {
    transforms.push('typescript')
  }
  if (loader === 'jsx' || loader === 'tsx') {
    transforms.push('jsx')
  }

  const importSource = options.jsxImportSource?.trim()

  try {
    const result = transform(text, {
      transforms,
      filePath: `input.${loader}`,
      disableESTransforms: options.newSyntax === 'keep',
      jsxRuntime: options.jsxRuntime ?? 'classic',
      ...(importSource ? { jsxImportSource: importSource } : {}),
    })
    return { code: result.code }
  }
  catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Transpile failed.'
    throw new Error(`Syntax error.\n\n${message}`, { cause })
  }
}
