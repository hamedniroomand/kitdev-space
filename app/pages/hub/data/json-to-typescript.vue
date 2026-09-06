<script setup lang="ts">
import { parseJson } from '#shared/utils/data/json'
import { jsonToTypeScript } from '#shared/utils/data/typescript'
import { getTextStats } from '#shared/utils/data/stats'

const input = ref('{\n  "id": 10,\n  "name": "Hamed",\n  "active": true\n}')
const output = ref('')
const statusMeta = ref('')
const { status, error, result, run, reset } = useTool<string>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const { downloadText } = useDownload()

useToolSeo('json-to-typescript')

async function convert() {
  await run(() => jsonToTypeScript(parseJson(input.value)))
  if (status.value === 'success' && result.value !== null) {
    output.value = result.value
    const stats = getTextStats(output.value)
    statusMeta.value = `${stats.lines} lines`
  }
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
  downloadText('types.ts', output.value, 'text/typescript')
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
      convert()
    }
  }
})
</script>

<template>
  <ToolPage>
    <template #header>
      <ToolHeader
        title="JSON → TypeScript"
        description="Convert JSON into TypeScript interfaces."
      />
    </template>

    <ToolEditor
      v-model="input"
      label="Input"
      placeholder="Paste JSON here"
      lang="json"
    />

    <ToolActions>
      <UButton
        label="Convert"
        icon="i-lucide-file-type"
        :loading="status === 'processing'"
        @click="convert"
      />
      <UButton
        :label="copyLabel()"
        :color="copyColor()"
        variant="subtle"
        :icon="copyIcon()"
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
      placeholder="TypeScript appears here"
      lang="typescript"
    />

    <ToolStatus
      v-if="status === 'success'"
      message="Converted"
      :meta="statusMeta"
    />

    <template #docs>
      <ToolDocs title="About JSON to TypeScript">
        <div class="space-y-4 text-muted">
          <p>
            This tool reads JSON and creates TypeScript interfaces from the shape of the data.
          </p>
          <p>
            Use the result as a start point. Review the types before you use them in production code.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'JSON Formatter', to: '/hub/data/json-formatter' },
            { label: 'JSON ↔ YAML', to: '/hub/data/converters/json-yaml' }
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
