<script setup lang="ts">
import type { FakeFieldConfig, FakeValue, FieldType } from '#shared/utils/data/fake-generator'
import type { ToolEditorLang } from '#shared/utils/dev/editor-lang'
import { useFileDialog } from '@vueuse/core'
import { DataError } from '#shared/utils/data/errors'
import {
  buildRecipe,
  formatAsCsv,
  formatAsSqlInserts,
  generateFieldValues,
  mapValuesToRows,
  parseRecipe,
  validateFields,
} from '#shared/utils/data/fake-generator'

useToolSeo('fake-data')

type OutputFormat = 'json' | 'csv' | 'sql'

const format = ref<OutputFormat>('json')
const rowCount = ref(10)
const tableName = ref('users')
const seed = ref<number | undefined>(undefined)
const refDate = ref('')
const sqlDialect = ref('sql')
const includeCreateTable = ref(false)
const generateError = ref<string | null>(null)
const generatedValues = ref<FakeValue[][]>([])

const sqlDialectItems = [
  { label: 'Standard SQL', value: 'sql' },
  { label: 'PostgreSQL', value: 'postgresql' },
  { label: 'MySQL', value: 'mysql' },
  { label: 'SQLite', value: 'sqlite' },
]

const availableTypes: { label: string, value: FieldType }[] = [
  { label: 'UUID', value: 'uuid' },
  { label: 'Auto-increment ID', value: 'integerId' },
  { label: 'Full Name', value: 'fullName' },
  { label: 'First Name', value: 'firstName' },
  { label: 'Last Name', value: 'lastName' },
  { label: 'Email Address', value: 'email' },
  { label: 'Phone Number', value: 'phone' },
  { label: 'Company Name', value: 'company' },
  { label: 'Job Title', value: 'jobTitle' },
  { label: 'City', value: 'city' },
  { label: 'Country', value: 'country' },
  { label: 'Past Date', value: 'date' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Price ($)', value: 'price' },
  { label: 'Integer (range)', value: 'integer' },
  { label: 'Float (range)', value: 'float' },
  { label: 'Enum (custom list)', value: 'enum' },
]

const fields = ref<FakeFieldConfig[]>([
  { name: 'id', type: 'integerId' },
  { name: 'name', type: 'fullName' },
  { name: 'email', type: 'email' },
  { name: 'company', type: 'company' },
  { name: 'job_title', type: 'jobTitle' },
  { name: 'created_at', type: 'date' },
])

const { copy, label, color, icon } = useCopyFeedback()
const { downloadText } = useDownload()

const fieldError = computed(() => validateFields(fields.value))

function regenerate() {
  generateError.value = null
  try {
    generatedValues.value = generateFieldValues({
      count: rowCount.value,
      fields: fields.value,
      seed: seed.value,
      refDate: refDate.value || undefined,
    })
  }
  catch (cause) {
    generatedValues.value = []
    generateError.value = cause instanceof DataError || cause instanceof Error
      ? cause.message
      : 'Cannot generate the data.'
  }
}

// Only an explicit Regenerate creates new data, so switching the output format
// or renaming a field reuses the rows that are already generated.
onMounted(() => {
  regenerate()
})

function applyPreset(preset: 'users' | 'products' | 'contacts') {
  if (preset === 'users') {
    tableName.value = 'users'
    fields.value = [
      { name: 'id', type: 'integerId' },
      { name: 'name', type: 'fullName' },
      { name: 'email', type: 'email' },
      { name: 'company', type: 'company' },
      { name: 'created_at', type: 'date' },
    ]
  }
  else if (preset === 'products') {
    tableName.value = 'products'
    fields.value = [
      { name: 'id', type: 'uuid' },
      { name: 'name', type: 'company' },
      { name: 'price', type: 'price' },
      { name: 'in_stock', type: 'boolean' },
    ]
  }
  else {
    tableName.value = 'contacts'
    fields.value = [
      { name: 'id', type: 'integerId' },
      { name: 'first_name', type: 'firstName' },
      { name: 'last_name', type: 'lastName' },
      { name: 'email', type: 'email' },
      { name: 'phone', type: 'phone' },
      { name: 'city', type: 'city' },
      { name: 'country', type: 'country' },
    ]
  }
  regenerate()
}

function addField() {
  fields.value.push({
    name: `field_${fields.value.length + 1}`,
    type: 'fullName',
  })
}

function removeField(index: number) {
  if (fields.value.length > 1) {
    fields.value.splice(index, 1)
  }
}

const rows = computed(() => {
  return mapValuesToRows(
    generatedValues.value,
    fields.value.map((f, idx) => f.name || `field_${idx + 1}`),
  )
})

const outputText = computed(() => {
  if (format.value === 'json') {
    return JSON.stringify(rows.value, null, 2)
  }
  if (format.value === 'csv') {
    return formatAsCsv(rows.value)
  }
  return formatAsSqlInserts(
    rows.value,
    tableName.value || 'table_name',
    sqlDialect.value,
    includeCreateTable.value,
  )
})
useLiveTool(outputText)

const editorLang = computed<ToolEditorLang>(() => {
  if (format.value === 'json')
    return 'json'
  if (format.value === 'sql')
    return 'sql'
  return 'text'
})

function handleCopy() {
  if (outputText.value) {
    copy(outputText.value)
  }
}

function handleDownloadRecipe() {
  const recipe = buildRecipe({
    count: rowCount.value,
    fields: fields.value,
    seed: seed.value,
    refDate: refDate.value || undefined,
    tableName: tableName.value,
  })
  downloadText(
    `${tableName.value || 'recipe'}-recipe.json`,
    JSON.stringify(recipe, null, 2),
    'application/json',
  )
}

const { open: openRecipeFile, onChange: onRecipeChange } = useFileDialog({
  accept: 'application/json,.json',
  multiple: false,
})

onRecipeChange(async (files) => {
  const file = files?.[0]
  if (!file) {
    return
  }
  generateError.value = null
  try {
    const recipe = parseRecipe(await file.text())
    fields.value = recipe.fields
    rowCount.value = recipe.count
    seed.value = recipe.seed
    refDate.value = recipe.refDate ?? ''
    tableName.value = recipe.tableName ?? tableName.value
    regenerate()
  }
  catch (cause) {
    generateError.value = cause instanceof Error ? cause.message : 'Cannot read the recipe file.'
  }
})

function handleDownload() {
  if (!outputText.value)
    return
  const extensions = { json: 'json', csv: 'csv', sql: 'sql' }
  const mimeTypes = {
    json: 'application/json',
    csv: 'text/csv',
    sql: 'application/sql',
  }
  const ext = extensions[format.value]
  downloadText(`mock-${tableName.value || 'data'}.${ext}`, outputText.value, mimeTypes[format.value])
}
</script>

<template>
  <ToolPage>
    <div class="space-y-6">
      <!-- Presets & Action Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-muted font-medium">Templates:</span>
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            label="Users Table"
            @click="applyPreset('users')"
          />
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            label="Products Table"
            @click="applyPreset('products')"
          />
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            label="Contacts Table"
            @click="applyPreset('contacts')"
          />
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-folder-open"
            label="Open Recipe"
            @click="openRecipeFile()"
          />
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-download"
            label="Download Recipe"
            @click="handleDownloadRecipe"
          />
          <UButton
            size="xs"
            color="primary"
            variant="solid"
            icon="i-lucide-refresh-cw"
            label="Generate Fresh Data"
            :disabled="!!fieldError"
            @click="regenerate"
          />
        </div>
      </div>

      <ToolError
        v-if="fieldError || generateError"
        :message="fieldError ?? generateError ?? ''"
      />

      <!-- Settings & Schema Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Schema Builder (Left Column) -->
        <div class="space-y-4 border border-default rounded-xl p-4 bg-elevated/20">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-default">
              Schema Fields ({{ fields.length }})
            </h3>
            <UButton
              size="xs"
              variant="subtle"
              color="primary"
              icon="i-lucide-plus"
              label="Add Field"
              @click="addField"
            />
          </div>

          <!-- General Controls -->
          <div class="grid grid-cols-2 gap-3 pt-1">
            <UFormField label="Row Count">
              <USelect
                v-model.number="rowCount"
                :items="[
                  { label: '5 Rows', value: 5 },
                  { label: '10 Rows', value: 10 },
                  { label: '25 Rows', value: 25 },
                  { label: '50 Rows', value: 50 },
                  { label: '100 Rows', value: 100 },
                ]"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Table Name">
              <UInput
                v-model="tableName"
                placeholder="users"
                class="w-full font-mono text-xs"
              />
            </UFormField>
            <UFormField
              label="Seed"
              help="Same seed and date give the same rows."
            >
              <UInput
                v-model.number="seed"
                type="number"
                placeholder="random"
                aria-label="Generation seed"
                class="w-full font-mono text-xs"
              />
            </UFormField>
            <UFormField label="Reference Date">
              <UInput
                v-model="refDate"
                type="date"
                aria-label="Reference date for relative dates"
                class="w-full text-xs"
              />
            </UFormField>
          </div>

          <!-- Field List -->
          <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
            <FakeFieldRow
              v-for="(f, idx) in fields"
              :key="idx"
              v-model="fields[idx]!"
              :type-items="availableTypes"
              :can-remove="fields.length > 1"
              @remove="removeField(idx)"
            />
          </div>
        </div>

        <!-- Output Preview (Right Column) -->
        <div class="lg:col-span-2 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center rounded-lg border border-default p-0.5 bg-default">
              <UButton
                size="xs"
                :variant="format === 'json' ? 'solid' : 'ghost'"
                color="neutral"
                label="JSON"
                @click="format = 'json'"
              />
              <UButton
                size="xs"
                :variant="format === 'csv' ? 'solid' : 'ghost'"
                color="neutral"
                label="CSV"
                @click="format = 'csv'"
              />
              <UButton
                size="xs"
                :variant="format === 'sql' ? 'solid' : 'ghost'"
                color="neutral"
                label="SQL Inserts"
                @click="format = 'sql'"
              />
            </div>

            <div
              v-if="format === 'sql'"
              class="flex flex-wrap items-center gap-2"
            >
              <USelect
                v-model="sqlDialect"
                :items="sqlDialectItems"
                size="xs"
                aria-label="SQL dialect"
              />
              <div class="flex items-center gap-1.5">
                <USwitch
                  v-model="includeCreateTable"
                  size="sm"
                  aria-label="Include CREATE TABLE statement"
                />
                <span class="text-xs text-muted">CREATE TABLE</span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <UButton
                size="xs"
                variant="subtle"
                color="neutral"
                icon="i-lucide-download"
                label="Download"
                @click="handleDownload"
              />
              <UButton
                size="xs"
                variant="subtle"
                :label="label()"
                :color="color()"
                :icon="icon()"
                @click="handleCopy"
              />
            </div>
          </div>

          <LazyToolEditor
            hydrate-on-idle
            :model-value="outputText"
            :label="`Output (${format.toUpperCase()} · ${rowCount} rows)`"
            :lang="editorLang"
            :rows="20"
            readonly
          />
        </div>
      </div>
    </div>

    <template #docs>
      <ToolDocs title="About mock data">
        <div class="space-y-4 text-muted">
          <p>
            This tool builds a mock data set from a schema that you define. Add a field, choose its type, and set the row count. The output is JSON, CSV, or SQL insert statements.
          </p>
          <p>
            Use realistic data to test a form, a table, or an import. A name, an email address, and a date that have the correct shape find bugs that the text abc does not find.
          </p>
          <p>
            Every value is generated in your browser. No real person is in the data, so you can share the output and put it in a test suite.
          </p>
          <p>
            <strong>Repeatable output:</strong>
            Set a seed and a reference date to get the same rows every time. The reference date anchors a relative date such as a past date, so a seeded run gives the same result on a later day.
          </p>
          <p>
            <strong>Generate once:</strong>
            Only Generate Fresh Data makes new values. A change to the output format, the table name, or a field name reuses the rows that exist.
          </p>
          <p>
            <strong>Field rules:</strong>
            An integer or float field takes a minimum and a maximum. An enum field takes your own list of values. A date field takes an interval. Each field takes a null rate as a percent, and a Unique switch that stops a repeated value.
          </p>
          <p>
            <strong>Recipes:</strong>
            Download Recipe saves the field schema, the seed, and the row count as JSON. It never holds the generated data. Open Recipe reads that file back.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Lorem Ipsum', to: '/hub/data/lorem' },
            { label: 'Table Viewer', to: '/hub/data/table-viewer' },
            { label: 'JSON Schema Validator', to: '/hub/data/json-schema' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
