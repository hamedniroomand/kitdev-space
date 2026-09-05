<script setup lang="ts">
import { minifyJson } from '~~/shared/utils/data/json'
import { getTextStats } from '~~/shared/utils/data/stats'

const input = ref('{\n  "name": "KitDev",\n  "ready": true\n}')
const output = ref('')
const statusMeta = ref('')
const toast = useToast()
const { status, error, result, run, reset } = useTool<string>()
const { copy, copied } = useClipboard({ legacy: true })
const { downloadText } = useDownload()

useToolSeo('json-minifier')

async function minify() {
  await run(() => minifyJson(input.value))
  if (status.value === 'success' && result.value !== null) {
    output.value = result.value
    const stats = getTextStats(output.value)
    statusMeta.value = `${stats.characters} characters · ${stats.bytes} bytes`
  }
}

async function handleCopy() {
  if (!output.value) {
    return
  }
  await copy(output.value)
  toast.add({ title: copied.value ? 'Copied' : 'Copy failed', color: copied.value ? 'success' : 'error' })
}

function handleDownload() {
  if (!output.value) {
    return
  }
  downloadText('minified.json', output.value)
}

function handleClear() {
  input.value = ''
  output.value = ''
  statusMeta.value = ''
  reset()
}

defineShortcuts({
  meta_enter: {
    usingInput: true,
    handler: () => {
      minify()
    }
  }
})
</script>

<template>
  <ToolPage>
    <template #header>
      <ToolHeader
        title="JSON Minifier"
        description="Minify JSON for smaller payloads."
      />
    </template>

    <ToolEditor
      v-model="input"
      label="Input"
      placeholder="Paste JSON here"
    />

    <ToolActions>
      <UButton
        label="Minify"
        icon="i-lucide-minimize-2"
        :loading="status === 'processing'"
        @click="minify"
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
      v-if="status === 'success'"
      message="Minified"
      :meta="statusMeta"
    />

    <template #docs>
      <DataToolDocs title="About JSON minifying">
        <div class="space-y-4 text-muted">
          <p>
            JSON minifying removes spaces and line breaks to reduce size.
          </p>
          <p>
            Use minified JSON for network payloads. Use formatted JSON for reading.
          </p>
        </div>
        <DataRelatedTools
          class="mt-8"
          :items="[
            { label: 'JSON Formatter', to: '/data/json-formatter' },
            { label: 'JSON Validator', to: '/data/json-validator' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
