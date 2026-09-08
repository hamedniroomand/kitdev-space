<script setup lang="ts">
import type { DataFormat } from '#shared/utils/data/types'
import { convertInBrowser } from '#shared/utils/data/convert'
import { detectConversionLossWarnings } from '#shared/utils/data/convert-warnings'
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
const warnings = ref<string[]>([])
const { status, error, result, run, reset } = useTool<string>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const { downloadText } = useDownload()

useToolSeo(props.toolId)

const inputLang = computed(() => (from.value === 'json' || from.value === 'json5' ? 'json' : 'text'))
const outputLang = computed(() => (to.value === 'json' || to.value === 'json5' ? 'json' : 'text'))

const downloadFilename = computed(() => {
  const base = props.downloadName.replace(/\.[^.]+$/, '') || 'converted'
  return `${base}.${to.value}`
})

const downloadMimeType = computed(() => {
  switch (to.value) {
    case 'json':
      return 'application/json'
    case 'yaml':
      return 'text/yaml'
    case 'toml':
      return 'application/toml'
    case 'xml':
      return 'application/xml'
    case 'json5':
      return 'application/json5'
    default:
      return props.downloadMime || 'text/plain'
  }
})

const editorAccept = computed(() => {
  const exts = props.formats.map(f => `.${f.value}`)
  if (props.formats.some(f => f.value === 'yaml')) {
    exts.push('.yml')
  }
  return `${exts.join(',')},text/*`
})

function onFileLoaded(file: File) {
  const name = file.name.toLowerCase()
  let targetFormat: Exclude<DataFormat, 'typescript'> | null = null
  if (name.endsWith('.yaml') || name.endsWith('.yml')) {
    targetFormat = 'yaml'
  }
  else if (name.endsWith('.toml')) {
    targetFormat = 'toml'
  }
  else if (name.endsWith('.json')) {
    targetFormat = 'json'
  }
  else if (name.endsWith('.xml')) {
    targetFormat = 'xml'
  }
  else if (name.endsWith('.json5')) {
    targetFormat = 'json5'
  }

  if (targetFormat && props.formats.some(f => f.value === targetFormat)) {
    from.value = targetFormat
    const alternate = props.formats.find(f => f.value !== targetFormat)
    if (alternate) {
      to.value = alternate.value
    }
  }
}

async function convert() {
  warnings.value = detectConversionLossWarnings(input.value, from.value, to.value)
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
  downloadText(downloadFilename.value, output.value, downloadMimeType.value)
}

function handleClear() {
  input.value = ''
  output.value = ''
  warnings.value = []
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
      :accept="editorAccept"
      @file-loaded="onFileLoaded"
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

    <div
      v-if="warnings.length > 0"
      class="space-y-2"
    >
      <UAlert
        v-for="(warning, idx) in warnings"
        :key="idx"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :title="warning"
      />
    </div>

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
