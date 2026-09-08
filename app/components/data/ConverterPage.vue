<script setup lang="ts">
import type { DataFormat } from '#shared/utils/data/types'
import { convertInBrowser } from '#shared/utils/data/convert'
import { getTextStats } from '#shared/utils/data/stats'

const props = defineProps<{
  toolId: string
  formats: { label: string, value: Exclude<DataFormat, 'typescript'> }[]
  defaultFrom: Exclude<DataFormat, 'typescript'>
  defaultTo: Exclude<DataFormat, 'typescript'>
  sample: string
  downloadName: string
  downloadMime?: string
  docsTitle: string
  docs: string[]
  related: { label: string, to: string }[]
}>()

const from = ref(props.defaultFrom)
const to = ref(props.defaultTo)
const input = ref(props.sample)
const output = ref('')
const statusMeta = ref('')
const { status, error, result, run, reset } = useTool<string>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const { downloadText } = useDownload()

useToolSeo(props.toolId)

const inputLang = computed(() => (from.value === 'json' || from.value === 'json5' ? 'json' : 'text'))
const outputLang = computed(() => (to.value === 'json' || to.value === 'json5' ? 'json' : 'text'))

async function convert() {
  await run(() => convertInBrowser(input.value, from.value, to.value), 'The convert operation failed.', { option: `${from.value}_to_${to.value}` })

  if (status.value === 'success' && result.value !== null) {
    output.value = result.value
    const stats = getTextStats(output.value)
    statusMeta.value = `${stats.characters} characters · ${stats.lines} lines`
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
  downloadText(props.downloadName, output.value, props.downloadMime)
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
    <UAlert
      color="success"
      variant="subtle"
      icon="i-lucide-shield-check"
      title="The data stays in your browser"
      description="Every conversion runs on the page. Nothing is uploaded."
      class="mb-2"
    />

    <FormatSelector
      v-model:from="from"
      v-model:to="to"
      :formats="formats"
    />

    <LazyToolEditor
      v-model="input"
      hydrate-on-idle
      label="Input"
      placeholder="Paste data here"
      :lang="inputLang"
    />

    <ToolActions>
      <UButton
        label="Convert"
        icon="i-lucide-arrow-left-right"
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
      placeholder="Result appears here"
      :lang="outputLang"
    />

    <ToolStatus
      v-if="status === 'success'"
      message="Converted"
      :meta="statusMeta"
    />

    <template #docs>
      <ToolDocs :title="docsTitle">
        <div class="space-y-4 text-muted">
          <p
            v-for="(paragraph, index) in docs"
            :key="index"
          >
            {{ paragraph }}
          </p>
          <p>
            JSON, YAML, TOML, JSON5, and XML all convert in your browser. The XML parser is the one
            that the browser ships, so no library is loaded and nothing is uploaded.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="related"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
