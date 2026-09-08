<script setup lang="ts">
import { parseJson } from '#shared/utils/data/json'
import { getTextStats } from '#shared/utils/data/stats'
import { jsonToTypeScript } from '#shared/utils/data/typescript'

const input = ref('{\n  "id": 10,\n  "name": "Hamed",\n  "active": true\n}')
const output = ref('')
const statusMeta = ref('')
const rootName = useToolOption('root-name', 'Root')
const exportMode = useToolOption<'typescript' | 'zod'>('export-mode', 'typescript')
const declarationType = useToolOption<'interface' | 'type'>('declaration-type', 'interface')
const widenNull = useToolOption('widen-null', false)
const exportModifier = useToolOption('export-modifier', false)
const readonlyModifier = useToolOption('readonly-modifier', false)
const { status, error, result, run, reset } = useTool<string>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const { downloadText } = useDownload()

useToolSeo('json-to-typescript')

async function convert() {
  await run(() => jsonToTypeScript(parseJson(input.value), {
    rootName: rootName.value || 'Root',
    declarationType: declarationType.value,
    exportMode: exportMode.value,
    widenNull: widenNull.value,
    exportModifier: exportModifier.value,
    readonlyModifier: readonlyModifier.value,
  }))
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
  const filename = exportMode.value === 'zod' ? 'schema.ts' : 'types.ts'
  downloadText(filename, output.value, 'text/typescript')
}

function handleClear() {
  input.value = ''
  output.value = ''
  statusMeta.value = ''
  reset()
}

useToolShortcuts({
  onRun: () => convert(),
  onCopy: () => handleCopy(),
})
</script>

<template>
  <ToolPage>
    <div class="flex flex-wrap items-center gap-4">
      <UFormField label="Root Type Name">
        <UInput
          v-model="rootName"
          placeholder="Root"
          class="w-48"
        />
      </UFormField>

      <UFormField label="Output Format">
        <USelect
          v-model="exportMode"
          :items="[
            { label: 'TypeScript', value: 'typescript' },
            { label: 'Zod Schema', value: 'zod' },
          ]"
          class="w-36"
        />
      </UFormField>

      <UFormField
        v-if="exportMode === 'typescript'"
        label="Declaration Syntax"
      >
        <USelect
          v-model="declarationType"
          :items="[
            { label: 'Interface', value: 'interface' },
            { label: 'Type Alias', value: 'type' },
          ]"
          class="w-36"
        />
      </UFormField>

      <div class="flex flex-wrap items-center gap-4 pt-6">
        <UCheckbox
          v-model="exportModifier"
          label="Export"
        />
        <UCheckbox
          v-model="readonlyModifier"
          label="Readonly"
        />
        <UCheckbox
          v-model="widenNull"
          label="Widen null"
        />
      </div>
    </div>

    <LazyToolEditor
      v-model="input"
      hydrate-on-idle
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

    <LazyToolEditor
      v-model="output"
      hydrate-on-idle
      label="Output"
      readonly
      :placeholder="exportMode === 'zod' ? 'Zod schema appears here' : 'TypeScript appears here'"
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
            { label: 'JSON ↔ YAML', to: '/hub/data/converters/json-yaml' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
