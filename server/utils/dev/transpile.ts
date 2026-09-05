export type TranspileLoader = 'ts' | 'tsx' | 'js' | 'jsx'

const MAX_INPUT_CHARS = 500_000

export function transpileSource(code: string, loader: TranspileLoader): { code: string } {
  const text = code ?? ''
  if (!text.trim()) {
    throw new Error('Enter source code before you run the tool.')
  }
  if (text.length > MAX_INPUT_CHARS) {
    throw new Error('Input is too large.')
  }

  try {
    const transpiler = new Bun.Transpiler({ loader })
    return { code: transpiler.transformSync(text) }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Transpile failed.'
    throw new Error(`Syntax error.\n\n${message}`, { cause })
  }
}
