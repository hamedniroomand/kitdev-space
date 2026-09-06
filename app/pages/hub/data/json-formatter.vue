<script setup lang="ts">
import { formatJson, minifyJson, validateJson } from '#shared/utils/data/json'
import { getTextStats } from '#shared/utils/data/stats'

const input = ref('{\n  "name": "KitDev",\n  "ready": true\n}')
const output = ref('')
const statusMessage = ref('')
const statusMeta = ref('')
const { status, error, result, run, reset } = useTool<string>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const validateFeedback = useActionFeedback({
  idle: {
    label: 'Validate',
    icon: 'i-lucide-circle-check',
    color: 'neutral',
    variant: 'subtle'
  },
  success: {
    label: 'Valid',
    icon: 'i-lucide-check',
    color: 'success',
    variant: 'subtle'
  },
  error: {
    label: 'Invalid',
    icon: 'i-lucide-x',
    color: 'error',
    variant: 'subtle'
  }
})
const { downloadText } = useDownload()

useToolSeo('json-formatter')

function setStats(text: string) {
  const stats = getTextStats(text)
  statusMeta.value = `${stats.characters} characters · ${stats.lines} lines · ${stats.bytes} bytes`
}

async function format() {
  validateFeedback.reset()
  await run(() => formatJson(input.value))
  if (status.value === 'success' && result.value !== null) {
    output.value = result.value
    statusMessage.value = 'Valid JSON'
    setStats(output.value)
  }
}

async function minify() {
  validateFeedback.reset()
  await run(() => minifyJson(input.value))
  if (status.value === 'success' && result.value !== null) {
    output.value = result.value
    statusMessage.value = 'Valid JSON'
    setStats(output.value)
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
    validateFeedback.flashSuccess()
  } else if (status.value === 'error') {
    validateFeedback.flashError()
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
  downloadText('formatted.json', output.value)
}

function handleClear() {
  input.value = ''
  output.value = ''
  statusMessage.value = ''
  statusMeta.value = ''
  validateFeedback.reset()
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
    <ToolEditor
      v-model="input"
      label="Input"
      placeholder="Paste JSON here"
      lang="json"
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
        :label="validateFeedback.label"
        :color="validateFeedback.color"
        :variant="validateFeedback.variant"
        :icon="validateFeedback.icon"
        @click="validate"
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
      placeholder="Result appears here"
      lang="json"
    />

    <ToolStatus
      v-if="status === 'success' && statusMessage"
      :message="statusMessage"
      :meta="statusMeta"
    />

    <template #docs>
      <ToolDocs title="About JSON formatting">
        <div class="space-y-4 text-muted">
          <p>
            JSON formatting adds spaces and line breaks so humans can read the data.
          </p>
          <p>
            Paste JSON in the input. Select Format to create indented output.
          </p>
          <p>
            The input also accepts JSON5 and JSONC. A comment, a trailing comma, a single quote, and
            an unquoted key are all read, and the output is strict JSON. This lets you paste a
            tsconfig.json or another config file with no edit.
          </p>
          <p>
            A common error is a missing comma or a missing bracket. The error message names the line.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'JSON → TypeScript', to: '/hub/data/json-to-typescript' },
            { label: 'JSON ↔ YAML', to: '/hub/data/converters/json-yaml' },
            { label: 'Text Diff', to: '/hub/data/text-diff' }
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
