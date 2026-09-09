import type { AstLanguage } from '#shared/utils/dev/ast'

export type AstSampleLevel = 'simple' | 'intermediate' | 'advanced'
export type AstSampleKey = `${AstLanguage}-${AstSampleLevel}`

export const AST_LANGUAGE_ITEMS: { label: string, value: AstLanguage }[] = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'JSX', value: 'jsx' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'TSX', value: 'tsx' },
]

export const AST_SAMPLE_LEVEL_ITEMS: { label: string, value: AstSampleLevel }[] = [
  { label: 'Simple', value: 'simple' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
]

export const AST_SAMPLES: Record<AstSampleKey, string> = {
  'javascript-simple': `const total = 1 + 2
console.log(total)
`,
  'javascript-intermediate': `import fs from 'node:fs'
import { join } from 'node:path'

export function readConfig(name) {
  const file = join('config', name)
  return fs.readFileSync(file, 'utf8')
}
`,
  'javascript-advanced': `import { EventEmitter } from 'node:events'

const registry = new WeakMap()

export class Queue extends EventEmitter {
  #items = []

  static from(...items) {
    const queue = new Queue()
    queue.#items.push(...items)
    return queue
  }

  async *drain({ limit = 10 } = {}) {
    for (let i = 0; i < limit && this.#items.length; i += 1) {
      const item = this.#items.shift()
      registry.set(this, item)
      yield await Promise.resolve(item ?? null)
    }
  }
}

const [first = 0, ...rest] = await Array.fromAsync(Queue.from(1, 2, 3).drain())
export default { first, rest, label: \`queue-\${rest.length}\` }
`,
  'jsx-simple': `export function Hello() {
  return <p>Hello</p>
}
`,
  'jsx-intermediate': `import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
`,
  'jsx-advanced': `import { Fragment, useMemo, useReducer } from 'react'

function reducer(state, action) {
  switch (action.type) {
    case 'add':
      return { ...state, items: [...state.items, action.value] }
    default:
      return state
  }
}

export function List({ rows, children, ...rest }) {
  const [state, dispatch] = useReducer(reducer, { items: [] })
  const total = useMemo(() => state.items.length, [state.items])

  return (
    <Fragment>
      <ul {...rest}>
        {rows.map(row => (
          <li key={row.id}>{row.label ?? <em>empty</em>}</li>
        ))}
      </ul>
      <button onClick={() => dispatch({ type: 'add', value: total })}>
        {total > 0 ? \`Add \${total}\` : 'Add first'}
      </button>
      {children}
    </Fragment>
  )
}
`,
  'typescript-simple': `export const total: number = 1 + 2
`,
  'typescript-intermediate': `import type { Dirent } from 'node:fs'
import { readdir } from 'node:fs/promises'

export async function listNames(dir: string): Promise<string[]> {
  const entries: Dirent[] = await readdir(dir, { withFileTypes: true })
  return entries.map(entry => entry.name)
}
`,
  'typescript-advanced': `import type { Buffer } from 'node:buffer'

export type Result<T, E extends Error = Error>
  = | { ok: true, value: T }
    | { ok: false, error: E }

export interface Store<T> {
  readonly size: number
  get: (key: string) => T | undefined
}

type Keys<T> = { [K in keyof T]-?: K extends string ? \`get\${Capitalize<K>}\` : never }[keyof T]

export type Getters<T> = Record<Keys<T> & string, () => unknown>

export abstract class BaseStore<T extends Record<string, unknown>> implements Store<T> {
  protected constructor(private readonly rows = new Map<string, T>()) {}

  get size(): number {
    return this.rows.size
  }

  get(key: string): T | undefined {
    return this.rows.get(key)
  }

  abstract encode(value: T): Buffer
}

export function unwrap<T>(input: Result<T>): T {
  if (!input.ok) {
    throw input.error
  }
  return input.value
}
`,
  'tsx-simple': `export function Title({ text }: { text: string }) {
  return <h1>{text}</h1>
}
`,
  'tsx-intermediate': `import { parseSync } from 'oxc-parser'

type Props = { title: string }

export function Title({ title }: Props) {
  const ast = parseSync('demo.tsx', '<h1 />')
  return <h1 data-nodes={ast.program.body.length}>{title}</h1>
}
`,
  'tsx-advanced': `import type { PropsWithChildren, ReactNode } from 'react'
import { useCallback, useId, useState } from 'react'

interface Row {
  id: string
  label?: string
}

type PanelProps<T extends Row> = PropsWithChildren<{
  rows: readonly T[]
  render?: (row: T) => ReactNode
}>

export function Panel<T extends Row>({ rows, render, children }: PanelProps<T>) {
  const id = useId()
  const [open, setOpen] = useState<boolean>(true)
  const toggle = useCallback(() => setOpen(value => !value), [])

  return (
    <section aria-labelledby={id}>
      <h2 id={id} onClick={toggle}>
        {open ? 'Hide' : 'Show'} {rows.length as number} rows
      </h2>
      {open && (
        <ul>
          {rows.map(row => (
            <li key={row.id}>{render?.(row) ?? (row.label satisfies string | undefined)}</li>
          ))}
        </ul>
      )}
      {children}
    </section>
  )
}
`,
}
