<script setup lang="ts">
import type { JsxRuntime, NewSyntaxMode, TranspileLoader } from '#shared/utils/dev/transpile'
import { transpileSource } from '#shared/utils/dev/transpile'

const input = ref(`type User = { name: string }

export function greet(user: User) {
  return \`Hello, \${user.name}\`
}
`)
const loader = ref<TranspileLoader>('ts')
const newSyntax = useToolOption<NewSyntaxMode>('new-syntax', 'compile')
const jsxRuntime = useToolOption<JsxRuntime>('jsx-runtime', 'classic')
const jsxImportSource = useToolOption('jsx-import-source', '')
const output = ref('')
const { status, error, run, reset } = useTool<string>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const { downloadText } = useDownload()

const loaderItems = [
  { label: 'TypeScript (.ts)', value: 'ts' },
  { label: 'TSX (.tsx)', value: 'tsx' },
  { label: 'JavaScript (.js)', value: 'js' },
  { label: 'JSX (.jsx)', value: 'jsx' },
]

const newSyntaxItems = [
  { label: 'Compile', value: 'compile' },
  { label: 'Keep', value: 'keep' },
]

const jsxRuntimeItems = [
  { label: 'Classic (React.createElement)', value: 'classic' },
  { label: 'Automatic (jsx-runtime import)', value: 'automatic' },
]

const hasJsx = computed(() => loader.value === 'tsx' || loader.value === 'jsx')

useToolSeo('transpiler')

const editorLang = computed(() => {
  switch (loader.value) {
    case 'ts':
      return 'typescript' as const
    case 'tsx':
      return 'tsx' as const
    case 'jsx':
      return 'jsx' as const
    case 'js':
    default:
      return 'javascript' as const
  }
})

async function execute() {
  output.value = ''
  await run(async () => {
    const res = await transpileSource(input.value, loader.value, {
      newSyntax: newSyntax.value,
      jsxRuntime: jsxRuntime.value,
      jsxImportSource: jsxImportSource.value,
    })
    output.value = res.code
    return res.code
  }, 'The transpile operation failed.')
}

async function handleCopy() {
  if (!output.value) {
    return
  }
  await copy(output.value)
}

function handleDownload() {
  if (!output.value) {
    return
  }
  downloadText('transpiled.js', output.value, 'text/javascript')
}

function handleClear() {
  input.value = ''
  output.value = ''
  reset()
}

useToolShortcuts({
  onRun: () => execute(),
  onCopy: () => handleCopy(),
})
</script>

<template>
  <ToolPage>
    <UAlert
      color="neutral"
      variant="subtle"
      title="Processed locally"
      description="This tool runs in the browser."
    />

    <p class="text-sm leading-relaxed text-muted">
      This tool removes the type annotations. It does not check the types. Code with a type error
      transpiles without a warning.
    </p>

    <div class="flex flex-wrap gap-4">
      <UFormField label="Loader">
        <USelect
          v-model="loader"
          :items="loaderItems"
          class="w-52"
        />
      </UFormField>
      <UFormField
        label="New syntax"
        help="Compile changes optional chaining, nullish coalescing, class fields, numeric separators, and optional catch binding. Arrow functions, async functions, and classes stay as they are."
      >
        <USelect
          v-model="newSyntax"
          :items="newSyntaxItems"
          class="w-40"
        />
      </UFormField>
      <UFormField
        label="JSX runtime"
        :help="hasJsx ? undefined : 'Select a TSX or a JSX loader to use this option.'"
      >
        <USelect
          v-model="jsxRuntime"
          :items="jsxRuntimeItems"
          :disabled="!hasJsx"
          class="w-64"
        />
      </UFormField>
    </div>

    <UFormField
      label="JSX import source"
      :help="hasJsx && jsxRuntime === 'automatic' ? 'Leave it empty to import from react.' : 'Only the automatic JSX runtime reads this option.'"
    >
      <UInput
        v-model="jsxImportSource"
        :disabled="!hasJsx || jsxRuntime !== 'automatic'"
        placeholder="react"
        class="w-full"
      />
    </UFormField>

    <LazyToolEditor
      v-model="input"
      hydrate-on-idle
      label="Input"
      placeholder="Paste TypeScript or JSX"
      :lang="editorLang"
    />

    <ToolActions>
      <UButton
        color="primary"
        :loading="status === 'processing'"
        @click="execute"
      >
        Transpile
      </UButton>
      <UButton
        :label="copyLabel()"
        :icon="copyIcon()"
        :color="copyColor()"
        variant="ghost"
        :disabled="!output"
        @click="handleCopy"
      />
      <UButton
        color="neutral"
        variant="ghost"
        :disabled="!output"
        @click="handleDownload"
      >
        Download
      </UButton>
      <UButton
        color="neutral"
        variant="ghost"
        @click="handleClear"
      >
        Clear
      </UButton>
    </ToolActions>

    <ToolError
      v-if="error"
      :message="error"
    />

    <LazyToolEditor
      v-model="output"
      hydrate-on-idle
      label="Output"
      readonly
      placeholder="JavaScript appears here"
      lang="javascript"
    />

    <template #docs>
      <ToolDocs title="About the transpiler">
        <p class="text-sm leading-relaxed text-muted">
          Sucrase removes the TypeScript types and converts the JSX in your browser. It loads only
          when you run the tool.
        </p>
        <p class="text-sm leading-relaxed text-muted">
          Transpilation removes the type annotations. It does not check the types. The tool accepts
          code that the TypeScript compiler rejects, and it gives no type error. Run
          <code>tsc --noEmit</code> to check the types.
        </p>
        <p class="text-sm leading-relaxed text-muted">
          Sucrase has no ECMAScript target option. The output keeps the syntax that you write. The
          <strong>New syntax</strong> option covers five features only: optional chaining, nullish
          coalescing, class fields, numeric separators, and optional catch binding. Use a full
          compiler for an old engine.
        </p>
        <p class="text-sm leading-relaxed text-muted">
          The automatic JSX runtime writes the development calls. It imports <code>jsxDEV</code>
          from <code>&lt;import source&gt;/jsx-dev-runtime</code>. The classic runtime writes
          <code>React.createElement</code>.
        </p>
        <RelatedTools
          :items="[
            { label: 'Code Minifier and Beautifier', to: '/hub/dev/code-minifier' },
            { label: 'JSON → TypeScript', to: '/hub/data/json-to-typescript' },
            { label: 'Tar Explorer', to: '/hub/dev/tar' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
