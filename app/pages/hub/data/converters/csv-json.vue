<script setup lang="ts">
import type {
  CsvDelimiter,
  CsvEmptyRepresentation,
  CsvMissingFieldHandling,
  CsvNullRepresentation,
} from '#shared/utils/data/csv'
import type { ColumnDataType, ColumnSchema } from '#shared/utils/data/csv-preview'
import { useFileDialog } from '@vueuse/core'
import { convertCsvJsonSql, CSV_DELIMITERS } from '#shared/utils/data/csv'
import { extractPreviewData } from '#shared/utils/data/csv-preview'
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
const nullValue = useToolOption<CsvNullRepresentation>('csv-null-val', 'null')
const emptyStringValue = useToolOption<CsvEmptyRepresentation>('csv-empty-val', 'quoted')
const missingFieldValue = useToolOption<CsvMissingFieldHandling>('csv-missing-val', 'null')
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

const nullValueItems = [
  { label: 'null', value: 'null' },
  { label: 'NULL', value: 'NULL' },
  { label: '\\N', value: '\\N' },
  { label: 'Empty', value: 'empty' },
]

const emptyStringItems = [
  { label: 'Quoted ("")', value: 'quoted' },
  { label: 'Empty ()', value: 'empty' },
]

const missingFieldItems = [
  { label: 'Treat as null', value: 'null' },
  { label: 'Treat as empty', value: 'empty' },
]

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

const excludeInvalidRows = ref(false)
const canExcludeInvalidRows = computed(() => {
  return Boolean(error.value && /Row \d+ has \d+ columns, expected \d+/i.test(error.value))
})

function handleExcludeInvalidRows() {
  excludeInvalidRows.value = true
  convert()
}

async function convert() {
  await run(() => {
    try {
      const next = convertCsvJsonSql({
        mode: mode.value,
        text: input.value,
        delimiter: delimiter.value,
        tableName: tableName.value,
        header: header.value,
        excludeInvalidRows: excludeInvalidRows.value,
        nullValue: nullValue.value,
        emptyStringValue: emptyStringValue.value,
        missingFieldValue: missingFieldValue.value,
      })
      detectedDelimiter.value = next.delimiter ?? null
      if (next.excludedRowCount && next.excludedRowCount > 0) {
        statusMeta.value = `Excluded ${next.excludedRowCount} invalid row${next.excludedRowCount > 1 ? 's' : ''}`
      }
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
    if (statusMeta.value.startsWith('Excluded')) {
      parts.unshift(statusMeta.value)
    }
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

const customColumnTypes = ref<Record<string, ColumnDataType>>({})

function handleClear() {
  input.value = ''
  output.value = ''
  statusMeta.value = ''
  detectedDelimiter.value = null
  excludeInvalidRows.value = false
  customColumnTypes.value = {}
  reset()
}

const toast = useToast()

const { open: openFileDialog, onChange: onFileChange } = useFileDialog({
  accept: '.csv,.tsv,.json,text/csv,application/json,text/plain',
  multiple: false,
})

async function handleFileLoaded(file: File) {
  try {
    const text = await file.text()
    input.value = text
    reportInput('file')
    toast.add({
      title: `Loaded ${file.name}`,
      color: 'success',
    })
  }
  catch {
    toast.add({
      title: 'Failed to read file',
      color: 'error',
    })
  }
}

onFileChange(async (files) => {
  if (!files || files.length === 0) {
    return
  }
  const file = files[0]
  if (file) {
    await handleFileLoaded(file)
  }
})

const previewData = computed(() => {
  if (!input.value.trim()) {
    return { columns: [], rows: [], totalRows: 0 }
  }
  try {
    const isJsonMode = mode.value === 'json-csv'
    const data = extractPreviewData(input.value, isJsonMode ? 'json' : 'csv', 50)
    const columns: ColumnSchema[] = data.columns.map((col) => {
      const customType = customColumnTypes.value[col.name]
      return {
        name: col.name,
        type: customType ?? col.type,
      }
    })
    return {
      columns,
      rows: data.rows,
      totalRows: data.totalRows,
    }
  }
  catch {
    return { columns: [], rows: [], totalRows: 0 }
  }
})

function handleUpdateColumnType(index: number, newType: ColumnDataType) {
  const col = previewData.value.columns[index]
  if (col) {
    customColumnTypes.value = {
      ...customColumnTypes.value,
      [col.name]: newType,
    }
  }
}

watch(input, () => {
  excludeInvalidRows.value = false
  customColumnTypes.value = {}
})

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
      <UFormField label="Null value">
        <USelect
          v-model="nullValue"
          :items="nullValueItems"
          class="w-36"
        />
      </UFormField>
      <UFormField label="Empty string">
        <USelect
          v-model="emptyStringValue"
          :items="emptyStringItems"
          class="w-36"
        />
      </UFormField>
      <UFormField
        v-if="mode === 'json-csv'"
        label="Missing fields"
      >
        <USelect
          v-model="missingFieldValue"
          :items="missingFieldItems"
          class="w-36"
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
      accept=".csv,.tsv,.json,text/csv,application/json,text/plain"
      @file-loaded="handleFileLoaded"
    />

    <ToolActions>
      <UButton
        label="Convert"
        icon="i-lucide-arrow-left-right"
        :loading="status === 'processing'"
        @click="convert"
      />
      <UButton
        label="Open File"
        color="neutral"
        variant="subtle"
        icon="i-lucide-folder-open"
        @click="openFileDialog()"
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

    <div
      v-if="canExcludeInvalidRows"
      class="flex items-center gap-3 p-3 rounded-lg border border-warning/30 bg-warning/10 text-sm"
    >
      <UIcon
        name="i-lucide-filter-x"
        class="w-5 h-5 text-warning shrink-0"
      />
      <span class="flex-1 text-muted">You can exclude invalid rows and convert the valid rows.</span>
      <UButton
        label="Exclude Invalid Rows"
        color="warning"
        variant="subtle"
        size="xs"
        icon="i-lucide-filter-x"
        @click="handleExcludeInvalidRows"
      />
    </div>

    <CsvPreviewTable
      v-if="previewData.columns.length > 0"
      :columns="previewData.columns"
      :rows="previewData.rows"
      :total-rows="previewData.totalRows"
      @update-type="handleUpdateColumnType"
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
            Select how to export null values, empty strings, and missing fields.
          </p>
          <p>
            Quoted empty strings preserve the difference between null values and empty strings.
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
