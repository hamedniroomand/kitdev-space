<script setup lang="ts">
import type { AstLanguage, AstTreeNode } from '#shared/utils/dev/ast'
import { sliceSource } from '#shared/utils/dev/ast'
import { AST_LANGUAGE_ITEMS, AST_SAMPLES } from '~/utils/dev/ast-samples'

type Panel = 'ast' | 'json' | 'transform' | 'resolve'

interface ParseResult {
  language: AstLanguage
  filename: string
  tree: AstTreeNode
  program: unknown
  imports: string[]
  errors: { message: string, codeframe?: string | null }[]
}

const PANEL_ITEMS: { label: string, value: Panel }[] = [
  { label: 'AST tree', value: 'ast' },
  { label: 'AST JSON', value: 'json' },
  { label: 'Transform', value: 'transform' },
  { label: 'Resolver', value: 'resolve' }
]

const language = ref<AstLanguage>('tsx')
const input = ref(AST_SAMPLES.tsx)
const panel = ref<Panel>('ast')
const parseResult = ref<ParseResult | null>(null)
const selected = ref<AstTreeNode | null>(null)
const transformed = ref('')
const resolvePanel = useTemplateRef('resolvePanel')
const { status, error, run, reset } = useTool<string>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

useToolSeo('ast-playground')

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

function clearResults() {
  parseResult.value = null
  selected.value = null
  transformed.value = ''
  resolvePanel.value?.clear()
  reset()
}

watch(language, (next) => {
  input.value = AST_SAMPLES[next]
  clearResults()
})

async function parseAst() {
  selected.value = null
  transformed.value = ''
  await run(async () => {
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
  }, 'The parse operation failed.')
}

async function runTransform() {
  await run(async () => {
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
  }, 'The transform operation failed.')
}

function showResolver() {
  panel.value = 'resolve'
  resolvePanel.value?.resolve()
}

function handleSelect(node: AstTreeNode) {
  selected.value = node
}

async function handleCopy(text: string, key: string) {
  await copy(text, key)
}

function handleClear() {
  input.value = ''
  clearResults()
}

function handleSample() {
  input.value = AST_SAMPLES[language.value]
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
          :items="AST_LANGUAGE_ITEMS"
          class="w-44"
        />
      </UFormField>
      <UFormField label="Panel">
        <USelect
          v-model="panel"
          :items="PANEL_ITEMS"
          class="w-40"
        />
      </UFormField>
    </div>

    <ToolEditor
      v-model="input"
      label="Source"
      placeholder="Paste JavaScript or TypeScript"
      :lang="language"
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
        :disabled="!parseResult?.imports.length"
        @click="showResolver"
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

    <DevAstSelectedNode
      v-if="selected"
      :node="selected"
      :snippet="selectedSnippet"
    />

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
          :label="copyLabel('json', 'Copy JSON')"
          size="sm"
          :color="copyColor('json')"
          variant="subtle"
          :icon="copyIcon('json')"
          @click="handleCopy(programJson, 'json')"
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
          :label="copyLabel('transform')"
          size="sm"
          :color="copyColor('transform')"
          variant="subtle"
          :icon="copyIcon('transform')"
          :disabled="!transformed"
          @click="handleCopy(transformed, 'transform')"
        />
      </div>
      <ToolEditor
        :model-value="transformed"
        label="OXC transform output"
        readonly
        placeholder="Select Transform to see output"
        :lang="language"
      />
    </div>

    <DevAstResolvePanel
      v-show="panel === 'resolve'"
      ref="resolvePanel"
      :imports="parseResult?.imports ?? []"
    />

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
