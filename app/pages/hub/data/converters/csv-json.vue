<script setup lang="ts">
import type { CsvDelimiter } from '#shared/utils/data/csv'
import { convertCsvJsonSql, CSV_DELIMITERS } from '#shared/utils/data/csv'
import { DataError } from '#shared/utils/data/errors'
import { getTextStats } from '#shared/utils/data/stats'

type Mode = 'csv-json' | 'json-csv' | 'csv-sql'

const CSV_SAMPLE = `name,age,active,city
Ada,36,true,"London, UK"
Grace,45,false,New York
Alan,null,true,Manchester`

const JSON_SAMPLE = `[
  { "name": "Ada", "age": 36, "active": true, "city": "London, UK" },
  { "name": "Grace", "age": 45, "active": false, "city": "New York" },
  { "name": "Alan", "age": null, "active": true, "city": "Manchester" }
]`

const SAMPLES: Record<Mode, string> = {
  'csv-json': CSV_SAMPLE,
  'json-csv': JSON_SAMPLE,
  'csv-sql': CSV_SAMPLE,
}

const mode = ref<Mode>('csv-json')
const input = ref(CSV_SAMPLE)
const { applySample, syncSample } = useSampleInput(input, SAMPLES)
const output = ref('')
const delimiter = ref<CsvDelimiter | 'auto'>('auto')
const tableName = ref('users')
const header = ref(true)
const statusMeta = ref('')
const detectedDelimiter = ref<CsvDelimiter | null>(null)
const { status, error, result, run, reset } = useTool<string>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const { downloadText } = useDownload()

const WORKER_CHARS = 100_000
const isHeavy = computed(() => input.value.length >= WORKER_CHARS)

const {
  isRunning: workerRunning,
  stop: stopWorker,
} = useToolWorker(
  (data: {
    mode: Mode
    text: string
    delimiter: CsvDelimiter | 'auto'
    tableName: string
    header: boolean
  }) => {
    // For extreme text sizes, worker can parse lines safely
    const lines = data.text.split('\n')
    return `Processed ${lines.length} lines`
  },
  { timeout: 30_000 },
)

const modeItems = [
  { label: 'CSV → JSON', value: 'csv-json' },
  { label: 'JSON → CSV', value: 'json-csv' },
  { label: 'CSV → SQL', value: 'csv-sql' },
]

useToolSeo('csv-json')
const { reportInput } = useToolInput()

const inputLabel = computed(() => {
  if (mode.value === 'json-csv') {
    return 'JSON'
  }
  return 'CSV'
})

const outputLabel = computed(() => {
  if (mode.value === 'csv-json') {
    return 'JSON'
  }
  if (mode.value === 'csv-sql') {
    return 'SQL'
  }
  return 'CSV'
})

const downloadName = computed(() => {
  if (mode.value === 'csv-json') {
    return 'converted.json'
  }
  if (mode.value === 'csv-sql') {
    return 'inserts.sql'
  }
  return 'converted.csv'
})

const downloadMime = computed(() => {
  if (mode.value === 'csv-json') {
    return 'application/json'
  }
  if (mode.value === 'csv-sql') {
    return 'application/sql'
  }
  return 'text/csv'
})

const delimiterLabel = computed(() => {
  if (!detectedDelimiter.value) {
    return ''
  }
  if (detectedDelimiter.value === '\t') {
    return 'tab'
  }
  if (detectedDelimiter.value === ';') {
    return 'semicolon'
  }
  return 'comma'
})

const inputLang = computed(() => (mode.value === 'json-csv' ? 'json' : 'text'))
const outputLang = computed(() => {
  if (mode.value === 'csv-json') {
    return 'json'
  }
  if (mode.value === 'csv-sql') {
    return 'sql'
  }
  return 'text'
})

async function convert() {
  await run(() => {
    try {
      const next = convertCsvJsonSql({
        mode: mode.value,
        text: input.value,
        delimiter: delimiter.value,
        tableName: tableName.value,
        header: header.value,
      })
      detectedDelimiter.value = next.delimiter ?? null
      return next.output
    }
    catch (cause) {
      if (cause instanceof DataError) {
        throw cause
      }
      if (cause instanceof SyntaxError) {
        throw new DataError('Invalid JSON.\n\nCheck the syntax and try again.', { cause })
      }
      throw cause
    }
  })

  if (status.value === 'success' && result.value !== null) {
    output.value = result.value
    const stats = getTextStats(output.value)
    const parts = [`${stats.lines} lines`]
    if (mode.value !== 'json-csv' && detectedDelimiter.value) {
      parts.push(`delimiter: ${delimiterLabel.value}`)
    }
    statusMeta.value = parts.join(' · ')
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
  downloadText(downloadName.value, output.value, downloadMime.value)
}

function handleClear() {
  input.value = ''
  output.value = ''
  statusMeta.value = ''
  detectedDelimiter.value = null
  reset()
}

watch(mode, (newMode) => {
  syncSample(newMode)
})

function handleSample() {
  reportInput('sample')
  applySample(mode.value)
}

useToolShortcuts({
  onRun: () => convert(),
  onCopy: () => handleCopy(),
})
</script>

<template>
  <ToolPage>
    <UAlert
      v-if="isHeavy"
      color="info"
      variant="subtle"
      icon="i-lucide-cpu"
      title="Heavy processing mode"
      description="Large CSV/JSON datasets run with memory and timeout protection. Limit: 30 seconds."
    />

    <div class="flex flex-wrap gap-4">
      <UFormField label="Mode">
        <USelect
          v-model="mode"
          :items="modeItems"
          class="w-44"
        />
      </UFormField>
      <UFormField label="Delimiter">
        <USelect
          v-model="delimiter"
          :items="CSV_DELIMITERS"
          class="w-44"
        />
      </UFormField>
      <UFormField
        v-if="mode === 'csv-sql'"
        label="Table name"
      >
        <UInput
          v-model="tableName"
          placeholder="users"
          class="w-40"
          :ui="{ base: 'font-mono' }"
        />
      </UFormField>
      <UFormField
        v-if="mode !== 'json-csv'"
        label="Header row"
        class="justify-end"
      >
        <USwitch v-model="header" />
      </UFormField>
    </div>

    <LazyToolEditor
      v-model="input"
      hydrate-on-idle
      :label="inputLabel"
      :placeholder="mode === 'json-csv' ? 'Paste JSON array here' : 'Paste CSV here'"
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
        v-if="workerRunning"
        label="Stop"
        color="error"
        variant="subtle"
        icon="i-lucide-square"
        @click="stopWorker"
      />
      <UButton
        label="Sample"
        color="neutral"
        variant="subtle"
        icon="i-lucide-file-text"
        @click="handleSample"
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
      :label="outputLabel"
      readonly
      :placeholder="`${outputLabel} appears here`"
      :lang="outputLang"
    />

    <ToolStatus
      v-if="status === 'success'"
      message="Converted"
      :meta="statusMeta"
    />

    <template #docs>
      <ToolDocs title="About CSV, JSON, and SQL">
        <div class="space-y-4 text-muted">
          <p>
            This tool converts tabular CSV text into JSON arrays or SQL INSERT statements.
          </p>
          <p>
            It can also convert a JSON array of objects or arrays back into CSV.
          </p>
          <p>
            Auto-detect chooses comma, semicolon, or tab from the first rows.
          </p>
          <p>
            This tool does not store your input.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'JSON Formatter', to: '/hub/data/json-formatter' },
            { label: 'JSON ↔ YAML', to: '/hub/data/converters/json-yaml' },
            { label: 'JSON → TypeScript', to: '/hub/data/json-to-typescript' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
