<script setup lang="ts">
import type { CsvDelimiter, CsvEmptyRepresentation, CsvMissingFieldHandling, CsvNullRepresentation } from '#shared/utils/data/csv'
import type { ColumnDataType, ColumnSchema, CsvExportFormat } from '#shared/utils/data/csv-preview'
import {
  exportFilteredDataset,
  extractPreviewData,
  getDownloadFilename,
  processHeavyCsvWorker,
} from '#shared/utils/data/csv-preview'
import { DataError } from '#shared/utils/data/errors'
import { getTextStats } from '#shared/utils/data/stats'

const CSV_SAMPLE = `name,age,active,city
Ada,36,true,"London, UK"
Grace,45,false,New York
Alan,null,true,Manchester`

const input = ref(CSV_SAMPLE)
const output = ref('')
const delimiter = ref<CsvDelimiter | 'auto'>('auto')
const detectedDelimiter = ref<string | null>(null)
const tableName = ref('users')
const statusMeta = ref('')
const exportFormat = ref<CsvExportFormat>('json')
const sqlDialect = ref<string>('sql')
const includeCreateTable = ref(false)

const nullValue = ref<CsvNullRepresentation>('null')
const emptyStringValue = ref<CsvEmptyRepresentation>('quoted')
const missingFieldValue = ref<CsvMissingFieldHandling>('null')

const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const { downloadText } = useDownload()
const { status, error, result, run, reset } = useTool<string>()

const WORKER_CHARS = 100_000
const isHeavy = computed(() => input.value.length >= WORKER_CHARS)

const {
  execute: workerScan,
  isRunning: workerRunning,
  stop: stopWorker,
} = useToolWorker(
  (payload: {
    text: string
    filterText?: string
    filterColIndex?: number
    delimiter?: string
  }) => processHeavyCsvWorker(payload),
  {
    timeout: 30_000,
    localDependencies: [processHeavyCsvWorker],
  },
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

const exportFormatItems = [
  { label: 'JSON', value: 'json' },
  { label: 'CSV', value: 'csv' },
  { label: 'TSV', value: 'tsv' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'SQL', value: 'sql' },
]

const sqlDialectItems = [
  { label: 'Standard SQL', value: 'sql' },
  { label: 'PostgreSQL', value: 'postgresql' },
  { label: 'MySQL', value: 'mysql' },
  { label: 'SQLite', value: 'sqlite' },
]

useToolSeo('csv-studio')
const { reportInput } = useToolInput()

const outputLang = computed(() => {
  if (exportFormat.value === 'json') {
    return 'json'
  }
  if (exportFormat.value === 'sql') {
    return 'sql'
  }
  if (exportFormat.value === 'markdown') {
    return 'markdown'
  }
  return 'text'
})

const customColumnTypes = ref<Record<string, ColumnDataType>>({})

const previewData = computed(() => {
  if (!input.value.trim()) {
    return { columns: [], rows: [], totalRows: 0 }
  }
  try {
    const trimmed = input.value.trim()
    const isJson = trimmed.startsWith('[') || trimmed.startsWith('{')
    const data = extractPreviewData(input.value, isJson ? 'json' : 'csv', 100)
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

const filteredPreviewRows = ref<string[][]>([])
const visibleColumnIndices = ref<number[]>([])

function onFilteredRowsChange(rows: string[][]) {
  filteredPreviewRows.value = rows
}

function onVisibleColumnsChange(indices: number[]) {
  visibleColumnIndices.value = indices
}

const isFiltered = computed(() => {
  if (visibleColumnIndices.value.length > 0 && visibleColumnIndices.value.length < previewData.value.columns.length) {
    return true
  }
  return filteredPreviewRows.value.length > 0 && filteredPreviewRows.value.length < previewData.value.rows.length
})

function getMimeType(format: CsvExportFormat): string {
  switch (format) {
    case 'json':
      return 'application/json'
    case 'csv':
      return 'text/csv'
    case 'tsv':
      return 'text/tab-separated-values'
    case 'markdown':
      return 'text/markdown'
    case 'sql':
      return 'application/sql'
  }
}

async function scanHeavyInput() {
  const payload = {
    text: input.value,
    delimiter: delimiter.value === 'auto' ? undefined : delimiter.value,
  }
  try {
    return await workerScan(payload)
  }
  catch {
    return processHeavyCsvWorker(payload)
  }
}

async function convert() {
  const heavyScan = isHeavy.value ? await scanHeavyInput() : null

  await run(() => {
    try {
      const result = exportFilteredDataset({
        rows: previewData.value.rows,
        columns: previewData.value.columns,
        format: exportFormat.value,
        delimiter: delimiter.value === 'auto' ? undefined : delimiter.value,
        tableName: tableName.value,
        includeCreateTable: includeCreateTable.value,
        sqlDialect: sqlDialect.value,
        nullOptions: {
          nullValue: nullValue.value,
          emptyStringValue: emptyStringValue.value,
          missingFieldValue: missingFieldValue.value,
        },
      })
      return result
    }
    catch (cause) {
      if (cause instanceof DataError) {
        throw cause
      }
      if (cause instanceof SyntaxError) {
        throw new DataError('Invalid input syntax.\n\nCheck your data format and try again.', { cause })
      }
      throw cause
    }
  })

  if (status.value === 'success' && result.value !== null) {
    output.value = result.value
    const stats = getTextStats(output.value)
    const scanned = heavyScan
      ? ` · scanned ${heavyScan.totalRows} rows in worker`
      : ''
    statusMeta.value = `${stats.lines} lines · format: ${exportFormat.value.toUpperCase()}${scanned}`
  }
}

async function handleCopy() {
  if (!output.value) {
    return
  }
  await copy(output.value)
}

function handleDownloadAll() {
  if (!output.value) {
    return
  }
  const content = exportFilteredDataset({
    rows: previewData.value.rows,
    columns: previewData.value.columns,
    format: exportFormat.value,
    delimiter: delimiter.value === 'auto' ? undefined : delimiter.value,
    tableName: tableName.value,
    includeCreateTable: includeCreateTable.value,
    sqlDialect: sqlDialect.value,
    nullOptions: {
      nullValue: nullValue.value,
      emptyStringValue: emptyStringValue.value,
      missingFieldValue: missingFieldValue.value,
    },
  })
  downloadText(getDownloadFilename(exportFormat.value, false), content, getMimeType(exportFormat.value))
}

function handleDownloadFiltered() {
  if (!output.value) {
    return
  }
  const content = exportFilteredDataset({
    rows: filteredPreviewRows.value,
    columns: previewData.value.columns,
    visibleColumnIndices: visibleColumnIndices.value.length > 0 ? visibleColumnIndices.value : undefined,
    format: exportFormat.value,
    delimiter: delimiter.value === 'auto' ? undefined : delimiter.value,
    tableName: tableName.value,
    includeCreateTable: includeCreateTable.value,
    sqlDialect: sqlDialect.value,
    nullOptions: {
      nullValue: nullValue.value,
      emptyStringValue: emptyStringValue.value,
      missingFieldValue: missingFieldValue.value,
    },
  })
  downloadText(getDownloadFilename(exportFormat.value, true), content, getMimeType(exportFormat.value))
}

const { setHandoffData, consumeHandoffData } = useTableViewerHandoff()

onMounted(() => {
  const handedOff = consumeHandoffData()
  if (handedOff) {
    input.value = handedOff
  }
})

function handleOpenInTableViewer() {
  const data = input.value.trim()
  if (!data) {
    return
  }
  setHandoffData(data)
  navigateTo('/hub/data/table-viewer')
}

function handleClear() {
  input.value = ''
  output.value = ''
  statusMeta.value = ''
  detectedDelimiter.value = null
  customColumnTypes.value = {}
  reset()
}

const toast = useToast()
const MAX_FILE_SIZE = 100 * 1024 * 1024

const { open: openFileDialog, onChange: onFileChange } = useFileDialog({
  accept: '.csv,.tsv,.json,text/csv,application/json,text/plain',
  multiple: false,
})

async function handleFileLoaded(file: File) {
  if (file.size > MAX_FILE_SIZE) {
    toast.add({
      title: 'File too large',
      description: 'Files larger than 100 MB cannot be processed in memory.',
      color: 'error',
    })
    return
  }
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

watch(input, () => {
  customColumnTypes.value = {}
})

function handleSample() {
  reportInput('sample')
  input.value = CSV_SAMPLE
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
      <UFormField label="Export Format">
        <USelect
          v-model="exportFormat"
          :items="exportFormatItems"
        />
      </UFormField>

      <UFormField
        v-if="exportFormat === 'sql'"
        label="SQL Dialect"
      >
        <USelect
          v-model="sqlDialect"
          :items="sqlDialectItems"
        />
      </UFormField>

      <UFormField
        v-if="exportFormat === 'sql'"
        label="Table Name"
      >
        <UInput
          v-model="tableName"
          placeholder="table_name"
        />
      </UFormField>

      <UFormField
        v-if="exportFormat === 'csv'"
        label="Delimiter"
      >
        <USelect
          v-model="delimiter"
          :items="[
            { label: 'Auto-detect', value: 'auto' },
            { label: 'Comma (,)', value: ',' },
            { label: 'Semicolon (;)', value: ';' },
            { label: 'Tab (\\t)', value: '\t' },
          ]"
        />
      </UFormField>

      <UFormField label="Null Values">
        <USelect
          v-model="nullValue"
          :items="nullValueItems"
        />
      </UFormField>

      <UFormField label="Empty Strings">
        <USelect
          v-model="emptyStringValue"
          :items="emptyStringItems"
        />
      </UFormField>

      <UFormField label="Missing Fields">
        <USelect
          v-model="missingFieldValue"
          :items="missingFieldItems"
        />
      </UFormField>
    </div>

    <div
      v-if="exportFormat === 'sql'"
      class="flex items-center gap-2 pt-1"
    >
      <UCheckbox
        v-model="includeCreateTable"
        label="Include CREATE TABLE statement"
      />
    </div>

    <ToolEditor
      v-model="input"
      label="Input Tabular Data"
      placeholder="Paste CSV, TSV, or JSON array here"
      lang="text"
    />

    <ToolActions>
      <UButton
        label="Convert"
        color="primary"
        icon="i-lucide-play"
        :loading="status === 'processing' || workerRunning"
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
        label="Upload file"
        color="neutral"
        variant="subtle"
        icon="i-lucide-upload"
        @click="() => openFileDialog()"
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
        label="Download all rows"
        color="neutral"
        variant="subtle"
        icon="i-lucide-download"
        :disabled="!output"
        @click="handleDownloadAll"
      />
      <UButton
        label="Download filtered rows"
        color="neutral"
        variant="subtle"
        icon="i-lucide-filter"
        :disabled="!output || !isFiltered"
        @click="handleDownloadFiltered"
      />
      <UButton
        label="Open in Table Viewer"
        color="neutral"
        variant="subtle"
        icon="i-lucide-table"
        :disabled="!input.trim()"
        @click="handleOpenInTableViewer"
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

    <CsvPreviewTable
      v-if="previewData.columns.length > 0"
      :columns="previewData.columns"
      :rows="previewData.rows"
      :total-rows="previewData.totalRows"
      @update-type="handleUpdateColumnType"
      @update-filtered-rows="onFilteredRowsChange"
      @update-visible-columns="onVisibleColumnsChange"
    />

    <LazyToolEditor
      v-model="output"
      hydrate-on-idle
      label="Output"
      readonly
      placeholder="Output appears here"
      :lang="outputLang"
    />

    <ToolStatus
      v-if="status === 'success'"
      message="Converted"
      :meta="statusMeta"
    />

    <template #docs>
      <ToolDocs title="About CSV Studio">
        <div class="space-y-4 text-muted">
          <p>
            CSV Studio processes tabular data directly in your browser.
          </p>
          <p>
            You can filter, sort, convert, and export data across CSV, TSV, JSON, Markdown, and SQL formats.
          </p>
          <p>
            The preview table uses virtualized rows to render large files smoothly without UI slowdowns.
          </p>
          <p>
            SQL export supports CREATE TABLE statements with dialect-specific quoting for PostgreSQL, MySQL, and SQLite.
          </p>
          <p>
            Files up to 100 MB can be processed. All data remains local in your browser.
          </p>
        </div>
      </ToolDocs>
    </template>
  </ToolPage>
</template>
