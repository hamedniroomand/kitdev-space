import type { AstLanguage } from '#shared/utils/dev/ast'

export const AST_LANGUAGE_ITEMS: { label: string, value: AstLanguage }[] = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'JSX', value: 'jsx' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'TSX', value: 'tsx' },
]

export const AST_SAMPLES: Record<AstLanguage, string> = {
  javascript: `import fs from 'node:fs'
import { join } from 'node:path'

export function readConfig(name) {
  const file = join('config', name)
  return fs.readFileSync(file, 'utf8')
}
`,
  jsx: `import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
`,
  typescript: `import type { Dirent } from 'node:fs'
import { readdir } from 'node:fs/promises'

export async function listNames(dir: string): Promise<string[]> {
  const entries: Dirent[] = await readdir(dir, { withFileTypes: true })
  return entries.map(entry => entry.name)
}
`,
  tsx: `import { parseSync } from 'oxc-parser'

type Props = { title: string }

export function Title({ title }: Props) {
  const ast = parseSync('demo.tsx', '<h1 />')
  return <h1 data-nodes={ast.program.body.length}>{title}</h1>
}
`,
}
