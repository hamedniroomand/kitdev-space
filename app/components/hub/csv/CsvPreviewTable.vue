<script setup lang="ts">
import type { ColumnDataType, ColumnSchema, ColumnSortState } from '#shared/utils/data/csv-preview'
import { COLUMN_TYPE_OPTIONS, filterRows, sortRows } from '#shared/utils/data/csv-preview'

const props = defineProps<{
  columns: ColumnSchema[]
  rows: string[][]
  totalRows: number
}>()

const emit = defineEmits<{
  updateType: [index: number, type: ColumnDataType]
  updateFilteredRows: [rows: string[][]]
  updateVisibleColumns: [visibleIndices: number[]]
}>()

const columnFilters = ref<Record<number, string>>({})
const sortState = ref<ColumnSortState | null>(null)
const hiddenColumns = ref<Set<number>>(new Set())
const columnsMenuOpen = ref(false)

function onTypeChange(index: number, newType: ColumnDataType) {
  emit('updateType', index, newType)
}

function toggleSort(colIdx: number) {
  if (sortState.value?.columnIndex === colIdx) {
    if (sortState.value.direction === 'asc') {
      sortState.value = { columnIndex: colIdx, direction: 'desc' }
    }
    else {
      sortState.value = null
    }
  }
  else {
    sortState.value = { columnIndex: colIdx, direction: 'asc' }
  }
}

function getAriaSort(colIdx: number): 'ascending' | 'descending' | 'none' {
  if (sortState.value?.columnIndex === colIdx) {
    return sortState.value.direction === 'asc' ? 'ascending' : 'descending'
  }
  return 'none'
}

function getSortIcon(colIdx: number): string {
  if (sortState.value?.columnIndex === colIdx) {
    return sortState.value.direction === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'
  }
  return 'i-lucide-arrow-up-down'
}

function toggleColumnVisibility(colIdx: number) {
  const next = new Set(hiddenColumns.value)
  if (next.has(colIdx)) {
    next.delete(colIdx)
  }
  else {
    if (next.size < props.columns.length - 1) {
      next.add(colIdx)
    }
  }
  hiddenColumns.value = next
}

function clearFilters() {
  columnFilters.value = {}
}

const hasActiveFilters = computed(() => {
  return Object.values(columnFilters.value).some(text => text.trim().length > 0)
})

const filteredRows = computed(() => filterRows(props.rows, columnFilters.value))

const sortedAndFilteredRows = computed(() => {
  if (!sortState.value) {
    return filteredRows.value
  }
  const colType = props.columns[sortState.value.columnIndex]?.type ?? 'text'
  return sortRows(filteredRows.value, sortState.value, colType)
})

const visibleColumnCount = computed(() => {
  return props.columns.filter((_, idx) => !hiddenColumns.value.has(idx)).length
})

const statusSummary = computed(() => {
  if (hasActiveFilters.value) {
    return `showing ${sortedAndFilteredRows.value.length} filtered of ${props.rows.length} rows`
  }
  return `showing ${props.rows.length} of ${props.totalRows} rows`
})

watch(sortedAndFilteredRows, (newRows) => {
  emit('updateFilteredRows', newRows)
}, { immediate: true })

watch(hiddenColumns, () => {
  const visible = props.columns
    .map((_, idx) => idx)
    .filter(idx => !hiddenColumns.value.has(idx))
  emit('updateVisibleColumns', visible)
}, { immediate: true })
</script>

<template>
  <div
    v-if="columns.length > 0 && rows.length > 0"
    class="border border-default rounded-xl overflow-hidden bg-elevated/40"
  >
    <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-default bg-muted/20">
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-table"
          class="w-4 h-4 text-primary"
        />
        <span class="text-xs font-medium text-highlighted">Table Preview</span>
        <span class="text-xs text-muted">
          ({{ statusSummary }})
        </span>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          v-if="hasActiveFilters"
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-lucide-filter-x"
          label="Clear filters"
          @click="clearFilters"
        />
        <UPopover v-model:open="columnsMenuOpen">
          <UButton
            size="xs"
            color="neutral"
            variant="subtle"
            icon="i-lucide-columns-3"
            label="Columns"
            aria-label="Toggle column visibility"
          />
          <template #content>
            <div class="w-56 p-3 space-y-2">
              <div class="text-xs font-semibold text-highlighted mb-1">
                Column Visibility
              </div>
              <div
                v-for="(col, colIdx) in columns"
                :key="colIdx"
                class="flex items-center gap-2 py-0.5"
              >
                <UCheckbox
                  :model-value="!hiddenColumns.has(colIdx)"
                  :label="col.name"
                  @update:model-value="toggleColumnVisibility(colIdx)"
                />
              </div>
            </div>
          </template>
        </UPopover>
      </div>
    </div>

    <div class="overflow-x-auto max-h-[360px]">
      <table class="w-full text-left border-collapse text-xs">
        <thead class="sticky top-0 bg-elevated z-10 border-b border-default shadow-xs">
          <tr>
            <th
              v-for="(col, colIdx) in columns"
              v-show="!hiddenColumns.has(colIdx)"
              :key="colIdx"
              :aria-sort="getAriaSort(colIdx)"
              class="p-2.5 font-medium min-w-[150px] border-r border-default/50 last:border-r-0 align-top"
            >
              <div class="flex flex-col gap-1.5">
                <button
                  type="button"
                  class="flex items-center justify-between w-full font-mono text-highlighted hover:text-primary transition-colors cursor-pointer text-left rounded focus:outline-hidden focus:ring-1 focus:ring-primary py-0.5"
                  :aria-label="`Sort by ${col.name}`"
                  @click="toggleSort(colIdx)"
                >
                  <span
                    class="truncate font-semibold"
                    :title="col.name"
                  >{{ col.name }}</span>
                  <UIcon
                    :name="getSortIcon(colIdx)"
                    class="w-3.5 h-3.5 shrink-0 ml-1"
                    :class="sortState?.columnIndex === colIdx ? 'text-primary' : 'text-muted/40'"
                  />
                </button>
                <USelect
                  :model-value="col.type"
                  :items="COLUMN_TYPE_OPTIONS"
                  size="xs"
                  class="w-full"
                  @update:model-value="(val) => onTypeChange(colIdx, val as ColumnDataType)"
                />
                <UInput
                  v-model="columnFilters[colIdx]"
                  size="xs"
                  placeholder="Filter..."
                  :aria-label="`Filter ${col.name}`"
                  class="w-full"
                />
              </div>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-default/40">
          <tr
            v-for="(row, rowIdx) in sortedAndFilteredRows"
            :key="rowIdx"
            class="hover:bg-muted/10 transition-colors"
          >
            <td
              v-for="(col, colIdx) in columns"
              v-show="!hiddenColumns.has(colIdx)"
              :key="colIdx"
              class="p-2.5 font-mono text-muted truncate max-w-[200px] border-r border-default/30 last:border-r-0"
              :title="row[colIdx] ?? ''"
            >
              {{ row[colIdx] ?? '' }}
            </td>
          </tr>
          <tr v-if="sortedAndFilteredRows.length === 0">
            <td
              :colspan="visibleColumnCount"
              class="p-6 text-center text-muted"
            >
              No matching rows found for the active filters.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
