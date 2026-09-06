<script setup lang="ts">
import {
  CSV_DELIMITERS,
  convertCsvJsonSql,
  type CsvDelimiter
} from '~~/shared/utils/data/csv'
import { DataError } from '~~/shared/utils/data/errors'
import { getTextStats } from '~~/shared/utils/data/stats'

type Mode = 'csv-json' | 'json-csv' | 'csv-sql'

const SAMPLE = `name,age,active,city
Ada,36,true,"London, UK"
Grace,45,false,New York
Alan,null,true,Manchester`

const input = ref(SAMPLE)
const output = ref('')
const mode = ref<Mode>('csv-json')
const delimiter = ref<CsvDelimiter | 'auto'>('auto')
const tableName = ref('users')
const header = ref(true)
const statusMeta = ref('')
const detectedDelimiter = ref<CsvDelimiter | null>(null)
const { status, error, result, run, reset } = useTool<string>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const { downloadText } = useDownload()

const modeItems = [
  { label: 'CSV → JSON', value: 'csv-json' },
  { label: 'JSON → CSV', value: 'json-csv' },
  { label: 'CSV → SQL', value: 'csv-sql' }
]

useToolSeo('csv-json')

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
        header: header.value
      })
      detectedDelimiter.value = next.delimiter ?? null
      return next.output
    } catch (cause) {
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

function handleSample() {
  input.value = SAMPLE
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
        title="CSV ↔ JSON / SQL"
        description="Convert CSV to JSON or SQL INSERT statements. Convert JSON arrays back to CSV."
      />
    </template>

    <UAlert
      color="neutral"
      variant="subtle"
      title="Processed locally"
      description="This tool runs in the browser. It can auto-detect comma, semicolon, and tab delimiters."
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

    <ToolEditor
      v-model="input"
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

    <ToolEditor
      v-model="output"
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
      <DataToolDocs title="About CSV, JSON, and SQL">
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
        <DataRelatedTools
          class="mt-8"
          :items="[
            { label: 'JSON Formatter', to: '/hub/data/json-formatter' },
            { label: 'JSON ↔ YAML', to: '/hub/data/converters/json-yaml' },
            { label: 'JSON → TypeScript', to: '/hub/data/json-to-typescript' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
