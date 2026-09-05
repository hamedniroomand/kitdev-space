<script setup lang="ts">
import { validateJson } from '~~/shared/utils/data/json'
import { getTextStats } from '~~/shared/utils/data/stats'

const input = ref('{\n  "name": "DevKit"\n}')
const statusMessage = ref('')
const statusMeta = ref('')
const { status, error, run, reset } = useTool<string>()

useToolSeo('json-validator')

async function validate() {
  await run(() => {
    const next = validateJson(input.value)
    if (!next.ok) {
      throw next.error
    }
    return 'ok'
  })
  if (status.value === 'success') {
    const stats = getTextStats(input.value)
    statusMessage.value = 'Valid JSON'
    statusMeta.value = `${stats.characters} characters · ${stats.lines} lines · ${stats.bytes} bytes`
  }
}

function handleClear() {
  input.value = ''
  statusMessage.value = ''
  statusMeta.value = ''
  reset()
}

defineShortcuts({
  meta_enter: {
    usingInput: true,
    handler: () => {
      validate()
    }
  }
})
</script>

<template>
  <ToolPage>
    <template #header>
      <ToolHeader
        title="JSON Validator"
        description="Validate JSON and show clear errors."
      />
    </template>

    <ToolEditor
      v-model="input"
      label="Input"
      placeholder="Paste JSON here"
    />

    <ToolActions>
      <UButton
        label="Validate"
        icon="i-lucide-circle-check"
        :loading="status === 'processing'"
        @click="validate"
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

    <ToolStatus
      v-if="status === 'success' && statusMessage"
      :message="statusMessage"
      :meta="statusMeta"
    />

    <template #docs>
      <DataToolDocs title="About JSON validation">
        <div class="space-y-4 text-muted">
          <p>
            JSON validation checks that the input follows JSON syntax rules.
          </p>
          <p>
            This tool reports the line and column when the parser finds a problem.
          </p>
        </div>
        <DataRelatedTools
          class="mt-8"
          :items="[
            { label: 'JSON Formatter', to: '/data/json-formatter' },
            { label: 'JSON Minifier', to: '/data/json-minifier' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
