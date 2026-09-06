<script setup lang="ts">
import type { AstTreeNode } from '~~/shared/utils/dev/ast'
import { sliceSource } from '~~/shared/utils/dev/ast'

type AstLanguage = 'javascript' | 'jsx' | 'typescript' | 'tsx'
type ResolveMode = 'esm' | 'node'
type Panel = 'ast' | 'json' | 'transform' | 'resolve'

type ParseResult = {
  language: AstLanguage
  filename: string
  tree: AstTreeNode
  program: unknown
  imports: string[]
  errors: { message: string, codeframe?: string | null }[]
}

type ResolveItem = {
  specifier: string
  ok: boolean
  path: string | null
  error: string | null
  packageJsonPath: string | null
}

const SAMPLES: Record<AstLanguage, string> = {
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
`
}

const language = ref<AstLanguage>('tsx')
const input = ref(SAMPLES.tsx)
const panel = ref<Panel>('ast')
const parseResult = ref<ParseResult | null>(null)
const selected = ref<AstTreeNode | null>(null)
const transformed = ref('')
const resolveMode = ref<ResolveMode>('esm')
const resolveDirectory = ref('')
const manualSpecifier = ref('')
const resolveRows = ref<ResolveItem[]>([])
const toast = useToast()
const { status, error, run, reset } = useTool<string>()
const { copy, copied } = useClipboard({ legacy: true })

const languageItems = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'JSX', value: 'jsx' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'TSX', value: 'tsx' }
]

const panelItems = [
  { label: 'AST tree', value: 'ast' },
  { label: 'AST JSON', value: 'json' },
  { label: 'Transform', value: 'transform' },
  { label: 'Resolver', value: 'resolve' }
]

const resolveModeItems = [
  { label: 'ESM (import)', value: 'esm' },
  { label: 'Node (require)', value: 'node' }
]

useToolSeo('ast-playground')

const editorLang = computed(() => language.value)

const selectedSnippet = computed(() => {
  if (!selected.value) {
    return ''
  }
  return sliceSource(input.value, selected.value.start, selected.value.end)
})

const programJson = computed(() => {
  if (!parseResult.value) {
    return ''
  }
  return JSON.stringify(parseResult.value.program, null, 2)
})

watch(language, (next) => {
  input.value = SAMPLES[next]
  parseResult.value = null
  selected.value = null
  transformed.value = ''
  resolveRows.value = []
  reset()
})

async function parseAst() {
  selected.value = null
  transformed.value = ''
  resolveRows.value = []
  await run(async () => {
    try {
      const data = await $fetch<{ result: ParseResult }>('/api/dev/ast', {
        method: 'POST',
        body: {
          mode: 'parse',
          input: input.value,
          language: language.value
        }
      })
      parseResult.value = data.result
      panel.value = 'ast'
      return data.result.filename
    } catch (cause) {
      const fetchError = cause as { data?: { message?: string }, statusMessage?: string }
      throw new Error(
        fetchError.data?.message || fetchError.statusMessage || 'The parse operation failed.',
        { cause }
      )
    }
  })
}

async function runTransform() {
  await run(async () => {
    try {
      const data = await $fetch<{ result: { code: string } }>('/api/dev/ast', {
        method: 'POST',
        body: {
          mode: 'transform',
          input: input.value,
          language: language.value
        }
      })
      transformed.value = data.result.code
      panel.value = 'transform'
      return data.result.code
    } catch (cause) {
      const fetchError = cause as { data?: { message?: string }, statusMessage?: string }
      throw new Error(
        fetchError.data?.message || fetchError.statusMessage || 'The transform operation failed.',
        { cause }
      )
    }
  })
}

async function runResolve(specifiers?: string[]) {
  const list = specifiers?.length
    ? specifiers
    : [
        ...new Set([
          ...(parseResult.value?.imports ?? []),
          ...(manualSpecifier.value.trim() ? [manualSpecifier.value.trim()] : [])
        ])
      ]

  await run(async () => {
    try {
      const data = await $fetch<{ result: ResolveItem[] }>('/api/dev/ast', {
        method: 'POST',
        body: {
          mode: 'resolve',
          resolveMode: resolveMode.value,
          directory: resolveDirectory.value || undefined,
          specifiers: list
        }
      })
      resolveRows.value = data.result
      panel.value = 'resolve'
      return JSON.stringify(data.result)
    } catch (cause) {
      const fetchError = cause as { data?: { message?: string }, statusMessage?: string }
      throw new Error(
        fetchError.data?.message || fetchError.statusMessage || 'The resolve operation failed.',
        { cause }
      )
    }
  })
}

function handleSelect(node: AstTreeNode) {
  selected.value = node
}

async function handleCopy(text: string) {
  if (!text) {
    return
  }
  await copy(text)
  toast.add({ title: copied.value ? 'Copied' : 'Copy failed', color: copied.value ? 'success' : 'error' })
}

function handleClear() {
  input.value = ''
  parseResult.value = null
  selected.value = null
  transformed.value = ''
  resolveRows.value = []
  reset()
}

function handleSample() {
  input.value = SAMPLES[language.value]
}

defineShortcuts({
  meta_enter: {
    usingInput: true,
    handler: () => {
      parseAst()
    }
  }
})
</script>

<template>
  <ToolPage>
    <template #header>
      <ToolHeader
        title="AST Playground and Resolver"
        description="Parse JavaScript and TypeScript with OXC. Inspect the ESTree AST and resolve module paths."
      />
    </template>

    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-server"
      title="Processed with OXC"
      description="Parse uses oxc-parser. Transform uses oxc-transform. Resolve uses oxc-resolver with Node and ESM rules."
    />

    <div class="flex flex-wrap gap-4">
      <UFormField label="Language">
        <USelect
          v-model="language"
          :items="languageItems"
          class="w-44"
        />
      </UFormField>
      <UFormField label="Panel">
        <USelect
          v-model="panel"
          :items="panelItems"
          class="w-40"
        />
      </UFormField>
    </div>

    <ToolEditor
      v-model="input"
      label="Source"
      placeholder="Paste JavaScript or TypeScript"
      :lang="editorLang"
    />

    <ToolActions>
      <UButton
        label="Parse AST"
        icon="i-lucide-git-fork"
        :loading="status === 'processing'"
        @click="parseAst"
      />
      <UButton
        label="Transform"
        color="neutral"
        variant="subtle"
        icon="i-lucide-wand-sparkles"
        :loading="status === 'processing'"
        @click="runTransform"
      />
      <UButton
        label="Resolve imports"
        color="neutral"
        variant="subtle"
        icon="i-lucide-folder-symlink"
        :loading="status === 'processing'"
        :disabled="!parseResult?.imports.length && !manualSpecifier.trim()"
        @click="runResolve()"
      />
      <UButton
        label="Sample"
        color="neutral"
        variant="subtle"
        icon="i-lucide-file-text"
        @click="handleSample"
      />
      <UButton
        label="Clear"
        color="neutral"
        variant="ghost"
        icon="i-lucide-eraser"
        @click="handleClear"
      />
    </ToolActions>

    <ToolError
      v-if="error"
      :message="error"
    />

    <UAlert
      v-for="(item, index) in parseResult?.errors ?? []"
      :key="`err-${index}`"
      color="warning"
      variant="subtle"
      :title="item.message"
      :description="item.codeframe || undefined"
    />

    <div
      v-if="selected"
      class="space-y-2 rounded-md border border-default p-3"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm font-medium text-highlighted">
          Selected · {{ selected.type }}
          <span
            v-if="selected.label"
            class="text-muted"
          >· {{ selected.label }}</span>
        </p>
        <p class="font-mono text-xs text-muted">
          {{ selected.span.start.line }}:{{ selected.span.start.column }}
          –
          {{ selected.span.end.line }}:{{ selected.span.end.column }}
          ({{ selected.start }}–{{ selected.end }})
        </p>
      </div>
      <pre class="overflow-x-auto rounded-md bg-elevated p-3 font-mono text-sm text-highlighted">{{ selectedSnippet || ' ' }}</pre>
    </div>

    <div
      v-if="panel === 'ast' && parseResult"
      class="max-h-[32rem] overflow-auto rounded-md border border-default p-2"
    >
      <DevAstTreeNode
        :node="parseResult.tree"
        :selected-id="selected?.id ?? null"
        @select="handleSelect"
      />
    </div>

    <div
      v-else-if="panel === 'json' && parseResult"
      class="space-y-2"
    >
      <div class="flex justify-end">
        <UButton
          label="Copy JSON"
          size="sm"
          color="neutral"
          variant="subtle"
          icon="i-lucide-copy"
          @click="handleCopy(programJson)"
        />
      </div>
      <ToolEditor
        :model-value="programJson"
        label="ESTree JSON"
        readonly
        lang="json"
      />
    </div>

    <div
      v-else-if="panel === 'transform'"
      class="space-y-2"
    >
      <div class="flex justify-end">
        <UButton
          label="Copy"
          size="sm"
          color="neutral"
          variant="subtle"
          icon="i-lucide-copy"
          :disabled="!transformed"
          @click="handleCopy(transformed)"
        />
      </div>
      <ToolEditor
        :model-value="transformed"
        label="OXC transform output"
        readonly
        placeholder="Select Transform to see output"
        :lang="editorLang"
      />
    </div>

    <div
      v-else-if="panel === 'resolve'"
      class="space-y-4"
    >
      <div class="flex flex-wrap gap-4">
        <UFormField label="Resolve mode">
          <USelect
            v-model="resolveMode"
            :items="resolveModeItems"
            class="w-44"
          />
        </UFormField>
        <UFormField
          label="From directory"
          class="min-w-56 flex-1"
          hint="Defaults to the server working directory."
        >
          <UInput
            v-model="resolveDirectory"
            placeholder="Leave empty for project root"
            class="w-full"
            :ui="{ base: 'font-mono' }"
          />
        </UFormField>
        <UFormField
          label="Extra specifier"
          class="min-w-40 flex-1"
        >
          <UInput
            v-model="manualSpecifier"
            placeholder="lodash/get"
            class="w-full"
            :ui="{ base: 'font-mono' }"
          />
        </UFormField>
      </div>

      <div
        v-if="parseResult?.imports.length"
        class="flex flex-wrap gap-2"
      >
        <UBadge
          v-for="item in parseResult.imports"
          :key="item"
          color="neutral"
          variant="subtle"
          class="font-mono"
        >
          {{ item }}
        </UBadge>
      </div>

      <UButton
        label="Resolve"
        icon="i-lucide-folder-symlink"
        :loading="status === 'processing'"
        @click="runResolve()"
      />

      <div
        v-if="resolveRows.length"
        class="overflow-x-auto rounded-md border border-default"
      >
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-default">
              <th class="px-3 py-2 text-left font-medium text-highlighted">
                Specifier
              </th>
              <th class="px-3 py-2 text-left font-medium text-highlighted">
                Result
              </th>
              <th class="px-3 py-2 text-left font-medium text-highlighted">
                Path
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr
              v-for="row in resolveRows"
              :key="row.specifier"
            >
              <td class="px-3 py-2 font-mono text-highlighted">
                {{ row.specifier }}
              </td>
              <td class="px-3 py-2">
                <UBadge
                  :color="row.ok ? 'success' : 'error'"
                  variant="subtle"
                >
                  {{ row.ok ? 'Resolved' : 'Failed' }}
                </UBadge>
              </td>
              <td class="break-all px-3 py-2 font-mono text-muted">
                {{ row.path || row.error }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <template #docs>
      <DataToolDocs title="About the AST playground">
        <div class="space-y-4 text-muted">
          <p>
            This tool parses JavaScript, TypeScript, and JSX with oxc-parser into an ESTree JSON tree.
          </p>
          <p>
            Select a node in the tree to see the exact source span for that node.
          </p>
          <p>
            Transform runs oxc-transform. Resolve tests module paths with oxc-resolver using ESM or Node condition names.
          </p>
          <p>
            This tool does not store your input.
          </p>
        </div>
        <DataRelatedTools
          class="mt-8"
          :items="[
            { label: 'TS / JSX Transpiler', to: '/hub/dev/transpiler' },
            { label: 'Code Minifier and Beautifier', to: '/hub/dev/code-minifier' },
            { label: 'JSON Formatter', to: '/hub/data/json-formatter' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
