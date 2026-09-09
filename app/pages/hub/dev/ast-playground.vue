<script setup lang="ts">
import type { EditorView } from '@codemirror/view'
import type { AstLanguage, AstTreeNode } from '#shared/utils/dev/ast'
import type { AstSampleKey, AstSampleLevel } from '~/utils/dev/ast-samples'
import { refDebounced } from '@vueuse/core'
import { findAstPathAtOffset, searchAstTypes, sliceSource } from '#shared/utils/dev/ast'
import { captureEditorView, onCursorOffset, selectRange } from '#shared/utils/dev/editor-cursor'
import { AST_LANGUAGE_ITEMS, AST_SAMPLE_LEVEL_ITEMS, AST_SAMPLES } from '~/utils/dev/ast-samples'

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
  { label: 'Resolver', value: 'resolve' },
]

const language = ref<AstLanguage>('tsx')
const level = ref<AstSampleLevel>('intermediate')
const sampleKey = computed<AstSampleKey>(() => `${language.value}-${level.value}`)
const input = ref(AST_SAMPLES['tsx-intermediate'])
const { applySample, syncSample } = useSampleInput(input, AST_SAMPLES)
const panel = ref<Panel>('ast')
// A large file gives a tree of tens of thousands of nodes. Keep it shallow, so
// Vue does not make a proxy for every node.
const parseResult = shallowRef<ParseResult | null>(null)
const selected = shallowRef<AstTreeNode | null>(null)
const transformed = ref('')
const typeFilter = ref('')
const resolvePanel = useTemplateRef('resolvePanel')
const { status, error, run, reset } = useTool<string>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

useToolSeo('ast-playground')

const editorView = shallowRef<EditorView | null>(null)
const caretOffset = ref(0)
// The caret reports every keystroke. Debounce it, so a large tree does not
// rebuild the open branches on each character.
const debouncedCaret = refDebounced(caretOffset, 250)
const debouncedFilter = refDebounced(typeFilter, 250)
// A click in the tree moves the caret. Hold the caret reaction, or the tool
// selects a deeper node at the same offset.
let holdCaret = false

const editorExtensions = [
  captureEditorView((view) => {
    editorView.value = view
  }),
  onCursorOffset((offset) => {
    if (!holdCaret) {
      caretOffset.value = offset
    }
  }),
]

const caretPath = computed(() => (
  findAstPathAtOffset(parseResult.value?.tree ?? null, debouncedCaret.value)
))

const typeSearch = computed(() => (
  searchAstTypes(parseResult.value?.tree ?? null, debouncedFilter.value)
))

const expandIds = computed(() => new Set([
  ...typeSearch.value.expand,
  ...caretPath.value.slice(0, -1).map(node => node.id),
]))

watch(debouncedCaret, () => {
  const node = caretPath.value.at(-1)
  if (node) {
    selected.value = node
  }
})

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

watch(language, () => {
  // The tree belongs to the old language, so clear it. Keep pasted code.
  clearResults()
})

watch(sampleKey, (key) => {
  // The sample loads only while the editor holds no text of the user.
  if (syncSample(key)) {
    parseAst()
  }
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
        language: language.value,
      },
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
        language: language.value,
      },
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
  const view = editorView.value
  if (!view) {
    return
  }
  holdCaret = true
  selectRange(view, node.start, node.end)
  holdCaret = false
}

async function handleCopy(text: string, key: string) {
  await copy(text, key)
}

function handleClear() {
  input.value = ''
  typeFilter.value = ''
  clearResults()
}

async function handleSample() {
  applySample(sampleKey.value)
  await parseAst()
}

useToolShortcuts({
  onRun: () => parseAst(),
})
</script>

<template>
  <ToolPage>
    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-server"
      title="Processed with OXC"
      description="Parse uses oxc-parser. Transform uses oxc-transform. Resolve uses oxc-resolver against the dependencies of this site."
    />

    <div class="flex flex-wrap gap-4">
      <UFormField label="Language">
        <USelect
          v-model="language"
          :items="AST_LANGUAGE_ITEMS"
          class="w-44"
        />
      </UFormField>
      <UFormField label="Sample level">
        <USelect
          v-model="level"
          :items="AST_SAMPLE_LEVEL_ITEMS"
          class="w-40"
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

    <LazyToolEditor
      v-model="input"
      hydrate-on-idle
      label="Source"
      placeholder="Paste JavaScript or TypeScript"
      :lang="language"
      :extensions="editorExtensions"
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
        icon="i-lucide-code-xml"
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

    <AstSelectedNode
      v-if="selected"
      :node="selected"
      :snippet="selectedSnippet"
    />

    <div
      v-if="panel === 'ast' && parseResult"
      class="space-y-2"
    >
      <div class="flex flex-wrap items-end gap-4">
        <UFormField
          label="Node type filter"
          class="min-w-56 flex-1"
        >
          <UInput
            v-model="typeFilter"
            placeholder="Identifier"
            class="w-full"
            icon="i-lucide-search"
            :ui="{ base: 'font-mono' }"
          />
        </UFormField>
        <p
          v-if="debouncedFilter.trim()"
          class="pb-2 text-sm text-muted"
        >
          {{ typeSearch.matches.size }} marked nodes
        </p>
      </div>
      <div
        role="tree"
        aria-label="AST nodes"
        class="max-h-[32rem] overflow-auto rounded-md border border-default p-2"
      >
        <AstTreeNode
          :node="parseResult.tree"
          :selected-id="selected?.id ?? null"
          :match-ids="typeSearch.matches"
          :expand-ids="expandIds"
          @select="handleSelect"
        />
      </div>
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
      <LazyToolEditor
        hydrate-on-idle
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
      <LazyToolEditor
        hydrate-on-idle
        :model-value="transformed"
        label="OXC transform output"
        readonly
        placeholder="Select Transform to see output"
        :lang="language"
      />
    </div>

    <AstResolvePanel
      v-show="panel === 'resolve'"
      ref="resolvePanel"
      :imports="parseResult?.imports ?? []"
    />

    <template #docs>
      <ToolDocs title="About the AST playground">
        <div class="space-y-4 text-muted">
          <h3 class="text-highlighted">
            Active parsers
          </h3>
          <p>
            oxc-parser reads the source and gives an ESTree JSON tree. It accepts the
            four languages in the list: JavaScript, JSX, TypeScript, and TSX. It reads
            the source as an ECMAScript module, and it accepts the syntax of the current
            ECMAScript standard, ES2025. Earlier standards are a subset of ES2025, so no
            version switch is necessary. TypeScript and TSX add the TypeScript type
            syntax. JSON is not a parser option.
          </p>
          <p>
            oxc-transform removes the TypeScript types and compiles JSX with the
            automatic runtime. oxc-resolver reads the module paths with ESM or Node
            condition names.
          </p>
          <h3 class="text-highlighted">
            Scope of the resolver
          </h3>
          <p>
            The resolver reads only the dependencies that this site installs. It cannot
            read the dependencies of your own project, and the directory field cannot
            leave the project root of the site. Use it to compare ESM and Node
            resolution rules, not to test your own lockfile.
          </p>
          <h3 class="text-highlighted">
            Navigation
          </h3>
          <p>
            Move the caret in the editor to select the deepest node at that position.
            Select a node in the tree to highlight the same character range in the
            editor. The tree accepts the arrow keys: up and down move between the open
            nodes, right opens a node, and left closes it.
          </p>
          <p>
            This tool does not store your input.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'TS / JSX Transpiler', to: '/hub/dev/transpiler' },
            { label: 'Code Minifier and Beautifier', to: '/hub/dev/code-minifier' },
            { label: 'JSON Formatter', to: '/hub/data/json-formatter' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
