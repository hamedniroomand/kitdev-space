export type TranspileLoader = 'ts' | 'tsx' | 'js' | 'jsx'

const MAX_INPUT_CHARS = 500_000

export async function transpileSource(
  code: string,
  loader: TranspileLoader,
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

  try {
    const result = transform(text, {
      transforms,
      filePath: `input.${loader}`,
    })
    return { code: result.code }
  }
  catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Transpile failed.'
    throw new Error(`Syntax error.\n\n${message}`, { cause })
  }
}
