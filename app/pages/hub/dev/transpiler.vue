<script setup lang="ts">
type TranspileLoader = 'ts' | 'tsx' | 'js' | 'jsx'

const input = ref(`type User = { name: string }

export function greet(user: User) {
  return \`Hello, \${user.name}\`
}
`)
const loader = ref<TranspileLoader>('ts')
const output = ref('')
const { status, error, run, reset } = useTool<string>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const { downloadText } = useDownload()

const loaderItems = [
  { label: 'TypeScript (.ts)', value: 'ts' },
  { label: 'TSX (.tsx)', value: 'tsx' },
  { label: 'JavaScript (.js)', value: 'js' },
  { label: 'JSX (.jsx)', value: 'jsx' }
]

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
    const data = await $fetch<{ result: string }>('/api/dev/transpile', {
      method: 'POST',
      body: {
        input: input.value,
        loader: loader.value
      }
    })
    output.value = data.result
    return data.result
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

defineShortcuts({
  meta_enter: {
    usingInput: true,
    handler: () => {
      execute()
    }
  }
})
</script>

<template>
  <ToolPage>
    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-server"
      title="Processed with Bun"
      description="This tool uses Bun.Transpiler on the server."
    />

    <UFormField label="Loader">
      <USelect
        v-model="loader"
        :items="loaderItems"
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
      <ToolDocs title="About Bun.Transpiler">
        <p class="text-sm leading-relaxed text-muted">
          Bun strips TypeScript types and converts JSX without loading Babel or the TypeScript compiler.
        </p>
        <RelatedTools
          :items="[
            { label: 'Code Minifier and Beautifier', to: '/hub/dev/code-minifier' },
            { label: 'JSON → TypeScript', to: '/hub/data/json-to-typescript' },
            { label: 'Tar Explorer', to: '/hub/dev/tar' }
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
