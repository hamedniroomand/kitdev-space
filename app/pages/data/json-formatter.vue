<script setup lang="ts">
import { formatJson, minifyJson, validateJson } from '~~/shared/utils/data/json'
import { getTextStats } from '~~/shared/utils/data/stats'

const input = ref('{\n  "name": "DevKit",\n  "ready": true\n}')
const output = ref('')
const statusMessage = ref('')
const statusMeta = ref('')
const toast = useToast()
const { status, error, result, run, reset } = useTool<string>()
const { copy } = useClipboard()
const { downloadText } = useDownload()
const { track } = useToolAnalytics()

useToolSeo('json-formatter')

onMounted(() => {
  track('tool_open', { tool: 'json-formatter' })
})

function setStats(text: string) {
  const stats = getTextStats(text)
  statusMeta.value = `${stats.characters} characters · ${stats.lines} lines · ${stats.bytes} bytes`
}

async function format() {
  await run(() => formatJson(input.value))
  if (status.value === 'success' && result.value !== null) {
    output.value = result.value
    statusMessage.value = 'Valid JSON'
    setStats(output.value)
    track('tool_execute', { tool: 'json-formatter' })
  } else if (status.value === 'error') {
    track('tool_error', { tool: 'json-formatter' })
  }
}

async function minify() {
  await run(() => minifyJson(input.value))
  if (status.value === 'success' && result.value !== null) {
    output.value = result.value
    statusMessage.value = 'Valid JSON'
    setStats(output.value)
    track('tool_execute', { tool: 'json-formatter' })
  } else if (status.value === 'error') {
    track('tool_error', { tool: 'json-formatter' })
  }
}

async function validate() {
  await run(() => {
    const next = validateJson(input.value)
    if (!next.ok) {
      throw next.error
    }
    return 'ok'
  })
  if (status.value === 'success') {
    statusMessage.value = 'Valid JSON'
    setStats(input.value)
    track('tool_execute', { tool: 'json-formatter' })
  } else if (status.value === 'error') {
    track('tool_error', { tool: 'json-formatter' })
  }
}

async function handleCopy() {
  if (!output.value) {
    return
  }
  const ok = await copy(output.value)
  toast.add({ title: ok ? 'Copied' : 'Copy failed', color: ok ? 'success' : 'error' })
  if (ok) {
    track('tool_copy', { tool: 'json-formatter' })
  }
}

function handleDownload() {
  if (!output.value) {
    return
  }
  downloadText('formatted.json', output.value)
  track('tool_download', { tool: 'json-formatter' })
}

function handleClear() {
  input.value = ''
  output.value = ''
  statusMessage.value = ''
  statusMeta.value = ''
  reset()
}

defineShortcuts({
  meta_enter: {
    usingInput: true,
    handler: () => {
      format()
    }
  }
})
</script>

<template>
  <ToolPage>
    <template #header>
      <ToolHeader
        title="JSON Formatter"
        description="Format, minify, and validate JSON."
      />
    </template>

    <ToolEditor
      v-model="input"
      label="Input"
      placeholder="Paste JSON here"
    />

    <ToolActions>
      <UButton
        label="Format"
        icon="i-lucide-align-left"
        :loading="status === 'processing'"
        @click="format"
      />
      <UButton
        label="Minify"
        color="neutral"
        variant="subtle"
        icon="i-lucide-minimize-2"
        @click="minify"
      />
      <UButton
        label="Validate"
        color="neutral"
        variant="subtle"
        icon="i-lucide-circle-check"
        @click="validate"
      />
      <UButton
        label="Copy"
        color="neutral"
        variant="subtle"
        icon="i-lucide-copy"
        :disabled="!output"
        @click="handleCopy"
      />
      <UButton
        label="Download"
        color="neutral"
        variant="subtle"
        icon="i-lucide-download"
        :disabled="!output"
        @click="handleDownload"
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

    <ToolEditor
      v-model="output"
      label="Output"
      readonly
      placeholder="Result appears here"
    />

    <ToolStatus
      v-if="status === 'success' && statusMessage"
      :message="statusMessage"
      :meta="statusMeta"
    />

    <template #docs>
      <DataToolDocs title="About JSON formatting">
        <div class="space-y-4 text-muted">
          <p>
            JSON formatting adds spaces and line breaks so humans can read the data.
          </p>
          <p>
            Paste JSON in the input. Select Format to create indented output.
          </p>
          <p>
            Common errors include missing commas, trailing commas, and unquoted keys.
          </p>
        </div>
        <DataRelatedTools
          class="mt-8"
          :items="[
            { label: 'JSON Validator', to: '/data/json-validator' },
            { label: 'JSON Minifier', to: '/data/json-minifier' },
            { label: 'JSON → TypeScript', to: '/data/json-to-typescript' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
