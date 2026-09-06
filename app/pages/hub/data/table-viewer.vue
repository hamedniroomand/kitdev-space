<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  filterAndSortRows,
  parseToTable,
  type TableRow
} from '../../../../shared/utils/data/table-viewer'
import { useCopyFeedback } from '../../../composables/useCopyFeedback'

const sampleCsv = `id,name,role,department,salary
1,Alice Smith,Staff Engineer,Platform,165000
2,Bob Jones,Product Designer,Design,125000
3,Charlie Brown,Engineering Manager,Platform,180000
4,Dana White,Frontend Developer,Web,115000
5,Evan Taylor,Security Analyst,Infra,140000`

const sampleJson = JSON.stringify([
  { id: 101, product: 'Wireless Mouse', category: 'Electronics', price: 29.99, inStock: true },
  { id: 102, product: 'Mechanical Keyboard', category: 'Electronics', price: 89.99, inStock: true },
  { id: 103, product: 'Ergonomic Desk Chair', category: 'Furniture', price: 249.50, inStock: false },
  { id: 104, product: 'USB-C Cable Pack', category: 'Accessories', price: 15.00, inStock: true }
], null, 2)

const input = ref(sampleCsv)
const searchQuery = ref('')
const sortColumn = ref<string | null>(null)
const sortAsc = ref(true)

const { copy, label, color, icon } = useCopyFeedback()

const tableData = computed(() => {
  try {
    return parseToTable(input.value)
  } catch {
    return { columns: [], rows: [] }
  }
})

const displayedRows = computed<TableRow[]>(() => {
  return filterAndSortRows(
    tableData.value.rows,
    searchQuery.value,
    sortColumn.value || undefined,
    sortAsc.value
  )
})

function handleSort(col: string) {
  if (sortColumn.value === col) {
    if (sortAsc.value) {
      sortAsc.value = false
    } else {
      sortColumn.value = null
      sortAsc.value = true
    }
  } else {
    sortColumn.value = col
    sortAsc.value = true
  }
}

function handleLoadSample(type: 'csv' | 'json') {
  input.value = type === 'csv' ? sampleCsv : sampleJson
  sortColumn.value = null
  searchQuery.value = ''
}

function handleClear() {
  input.value = ''
  sortColumn.value = null
  searchQuery.value = ''
}

function handleCopyJson() {
  copy(JSON.stringify(displayedRows.value, null, 2))
}

function handleDownloadCsv() {
  if (tableData.value.columns.length === 0) return
  const cols = tableData.value.columns
  const lines = [cols.join(',')]
  for (const row of displayedRows.value) {
    const vals = cols.map((c) => {
      const val = String(row[c] ?? '')
      return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val
    })
    lines.push(vals.join(','))
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'table-export.csv'
  a.click()
  URL.revokeObjectURL(url)
}

useSeoMeta({
  title: 'Table Viewer — KitDev Space',
  description: 'View, sort, filter, and export CSV and JSON datasets in an interactive table.'
})
</script>

<template>
  <ToolPage
    title="Table Viewer"
    description="Paste CSV or JSON datasets to view, sort, search, and export data in an interactive table."
  >
    <div class="space-y-6">
      <!-- Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <div class="flex items-center gap-2">
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-file-text"
            label="Load CSV Sample"
            @click="handleLoadSample('csv')"
          />
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-file-code"
            label="Load JSON Sample"
            @click="handleLoadSample('json')"
          />
        </div>

        <div class="flex items-center gap-2">
          <UButton
            label="Clear"
            icon="i-lucide-eraser"
            size="xs"
            color="neutral"
            variant="ghost"
            :disabled="!input"
            @click="handleClear"
          />
        </div>
      </div>

      <!-- Input Editor -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-default">
          Data Source (Paste CSV or JSON array)
        </label>
        <UTextarea
          v-model="input"
          :rows="6"
          placeholder="Paste CSV rows or JSON array of objects here..."
          class="font-mono text-xs w-full"
        />
      </div>

      <!-- Table Section -->
      <div
        v-if="tableData.columns.length > 0"
        class="space-y-4"
      >
        <!-- Table Search and Actions Bar -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div class="max-w-xs w-full">
            <UInput
              v-model="searchQuery"
              icon="i-lucide-search"
              placeholder="Search table rows..."
              size="sm"
            />
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs text-muted">
              Showing {{ displayedRows.length }} of {{ tableData.rows.length }} rows
            </span>
            <UButton
              size="xs"
              variant="subtle"
              color="neutral"
              icon="i-lucide-download"
              label="Download CSV"
              @click="handleDownloadCsv"
            />
            <UButton
              size="xs"
              variant="subtle"
              :label="label()"
              :color="color()"
              :icon="icon()"
              @click="handleCopyJson"
            />
          </div>
        </div>

        <!-- Rendered Table -->
        <div class="border border-default rounded-xl overflow-hidden">
          <div class="overflow-x-auto max-h-[500px]">
            <table class="w-full text-left text-xs border-collapse">
              <thead class="bg-elevated/80 sticky top-0 border-b border-default z-10 backdrop-blur-xs">
                <tr>
                  <th class="p-2.5 font-medium text-muted w-12 text-center">
                    #
                  </th>
                  <th
                    v-for="col in tableData.columns"
                    :key="col"
                    class="p-2.5 font-medium text-default cursor-pointer hover:bg-elevated transition-colors select-none"
                    @click="handleSort(col)"
                  >
                    <div class="flex items-center gap-1.5">
                      <span>{{ col }}</span>
                      <UIcon
                        v-if="sortColumn === col"
                        :name="sortAsc ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                        class="w-3.5 h-3.5 text-primary"
                      />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-default font-mono">
                <tr
                  v-for="(row, idx) in displayedRows"
                  :key="idx"
                  class="hover:bg-elevated/30 transition-colors"
                >
                  <td class="p-2.5 text-center text-muted font-sans text-[11px]">
                    {{ idx + 1 }}
                  </td>
                  <td
                    v-for="col in tableData.columns"
                    :key="col"
                    class="p-2.5 text-default"
                  >
                    <UBadge
                      v-if="typeof row[col] === 'boolean'"
                      size="xs"
                      :color="row[col] ? 'success' : 'neutral'"
                      variant="subtle"
                    >
                      {{ row[col] ? 'true' : 'false' }}
                    </UBadge>
                    <span v-else>{{ row[col] }}</span>
                  </td>
                </tr>
                <tr v-if="displayedRows.length === 0">
                  <td
                    :colspan="tableData.columns.length + 1"
                    class="p-6 text-center text-muted font-sans"
                  >
                    No rows match your search query.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </ToolPage>
</template>
