<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  type FakeFieldConfig,
  type FieldType,
  formatAsCsv,
  formatAsSqlInserts,
  generateFakeRows
} from '../../../../shared/utils/data/fake-generator'
import { useCopyFeedback } from '../../../composables/useCopyFeedback'
import type { ToolEditorLang } from '../../../../shared/utils/dev/editor-lang'

type OutputFormat = 'json' | 'csv' | 'sql'

const format = ref<OutputFormat>('json')
const rowCount = ref(10)
const tableName = ref('users')
const refreshKey = ref(0)

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
  { label: 'Price ($)', value: 'price' }
]

const fields = ref<FakeFieldConfig[]>([
  { name: 'id', type: 'integerId' },
  { name: 'name', type: 'fullName' },
  { name: 'email', type: 'email' },
  { name: 'company', type: 'company' },
  { name: 'job_title', type: 'jobTitle' },
  { name: 'created_at', type: 'date' }
])

const { copy, label, color, icon } = useCopyFeedback()

function applyPreset(preset: 'users' | 'products' | 'contacts') {
  if (preset === 'users') {
    tableName.value = 'users'
    fields.value = [
      { name: 'id', type: 'integerId' },
      { name: 'name', type: 'fullName' },
      { name: 'email', type: 'email' },
      { name: 'company', type: 'company' },
      { name: 'created_at', type: 'date' }
    ]
  } else if (preset === 'products') {
    tableName.value = 'products'
    fields.value = [
      { name: 'id', type: 'uuid' },
      { name: 'name', type: 'company' },
      { name: 'price', type: 'price' },
      { name: 'in_stock', type: 'boolean' }
    ]
  } else {
    tableName.value = 'contacts'
    fields.value = [
      { name: 'id', type: 'integerId' },
      { name: 'first_name', type: 'firstName' },
      { name: 'last_name', type: 'lastName' },
      { name: 'email', type: 'email' },
      { name: 'phone', type: 'phone' },
      { name: 'city', type: 'city' },
      { name: 'country', type: 'country' }
    ]
  }
  regenerate()
}

function addField() {
  fields.value.push({
    name: `field_${fields.value.length + 1}`,
    type: 'fullName'
  })
}

function removeField(index: number) {
  if (fields.value.length > 1) {
    fields.value.splice(index, 1)
  }
}

function regenerate() {
  refreshKey.value++
}

const rows = computed(() => {
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  refreshKey.value
  return generateFakeRows({
    count: rowCount.value,
    fields: fields.value
  })
})

const outputText = computed(() => {
  if (format.value === 'json') {
    return JSON.stringify(rows.value, null, 2)
  }
  if (format.value === 'csv') {
    return formatAsCsv(rows.value)
  }
  return formatAsSqlInserts(rows.value, tableName.value || 'table_name')
})

const editorLang = computed<ToolEditorLang>(() => {
  if (format.value === 'json') return 'json'
  if (format.value === 'sql') return 'sql'
  return 'text'
})

function handleCopy() {
  if (outputText.value) {
    copy(outputText.value)
  }
}

function handleDownload() {
  if (!outputText.value) return
  const extensions = { json: 'json', csv: 'csv', sql: 'sql' }
  const mimeTypes = {
    json: 'application/json',
    csv: 'text/csv',
    sql: 'application/sql'
  }
  const ext = extensions[format.value]
  const blob = new Blob([outputText.value], { type: mimeTypes[format.value] })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mock-${tableName.value || 'data'}.${ext}`
  a.click()
  URL.revokeObjectURL(url)
}

useSeoMeta({
  title: 'Fake Data Generator — KitDev Space',
  description: 'Generate realistic mock datasets with custom schemas as JSON, CSV, or SQL insert queries.'
})
</script>

<template>
  <ToolPage
    title="Fake Data Generator"
    description="Generate realistic mock datasets with custom schema fields in JSON, CSV, or SQL formats."
  >
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

        <div class="flex items-center gap-2">
          <UButton
            size="xs"
            color="primary"
            variant="solid"
            icon="i-lucide-refresh-cw"
            label="Generate Fresh Data"
            @click="regenerate"
          />
        </div>
      </div>

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
            <div class="space-y-1">
              <label class="text-xs text-muted font-medium">Row Count</label>
              <USelect
                v-model.number="rowCount"
                :items="[
                  { label: '5 Rows', value: 5 },
                  { label: '10 Rows', value: 10 },
                  { label: '25 Rows', value: 25 },
                  { label: '50 Rows', value: 50 },
                  { label: '100 Rows', value: 100 }
                ]"
                class="w-full"
              />
            </div>
            <div class="space-y-1">
              <label class="text-xs text-muted font-medium">Table Name</label>
              <UInput
                v-model="tableName"
                placeholder="users"
                class="w-full font-mono text-xs"
              />
            </div>
          </div>

          <!-- Field List -->
          <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
            <div
              v-for="(f, idx) in fields"
              :key="idx"
              class="p-2.5 rounded-lg border border-default bg-default space-y-2"
            >
              <div class="flex items-center justify-between gap-2">
                <UInput
                  v-model="f.name"
                  placeholder="Field name"
                  class="font-mono text-xs flex-1"
                />
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-trash-2"
                  :disabled="fields.length <= 1"
                  @click="removeField(idx)"
                />
              </div>
              <USelect
                v-model="f.type"
                :items="availableTypes"
                class="w-full text-xs"
              />
            </div>
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

          <ToolEditor
            :model-value="outputText"
            :label="`Output (${format.toUpperCase()} · ${rowCount} rows)`"
            :lang="editorLang"
            :rows="20"
            readonly
          />
        </div>
      </div>
    </div>
  </ToolPage>
</template>
