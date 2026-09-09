<script setup lang="ts">
import type { QueryResult, SqlValue } from '~/types/sqlite'
import type { TableSort } from '~/utils/sqlite/query-builder'
import { useVirtualList } from '@vueuse/core'
import { ROWID_ALIAS } from '~/utils/sqlite/query-builder'
import { blobPreview, formatByteSize, isBlobValue } from '~/utils/sqlite/statements'

/**
 * The result grid. When the result carries the rowid alias, a row can be
 * selected and a cell can be edited. The rowid comes from that column, so an
 * edit hits the right row whatever the first column is.
 */
const props = defineProps<{
  result: QueryResult | null
  activeTable: string | null
  /** The offset of the first row, so the row numbers continue across pages. */
  offset?: number
  sort?: TableSort | null
  sortable?: boolean
  selectedRowid?: number | null
  /** Declared SQLite type of each column, shown under the column name. */
  columnTypes?: Record<string, string>
}>()

const emit = defineEmits<{
  updateCell: [payload: { table: string, rowid: number, column: string, value: SqlValue }]
  sort: [column: string]
  selectRow: [rowid: number]
}>()

const rowidIndex = computed(() => props.result?.columns.indexOf(ROWID_ALIAS) ?? -1)
const canEdit = computed(() => rowidIndex.value >= 0 && !!props.activeTable)

/** The columns to show, with the index of each one in a row. */
const visibleColumns = computed(() => (props.result?.columns ?? [])
  .map((name, index) => ({ name, index }))
  .filter(column => column.index !== rowidIndex.value))

const editingCell = ref<{ rowIndex: number, colIndex: number } | null>(null)
const editValue = ref('')

const ROW_HEIGHT = 29
const allRows = computed(() => props.result?.rows ?? [])

const { list: virtualRows, containerProps } = useVirtualList(allRows, {
  itemHeight: ROW_HEIGHT,
  overscan: 12,
})

const paddingTop = computed(() => (virtualRows.value[0]?.index ?? 0) * ROW_HEIGHT)

const paddingBottom = computed(() => {
  if (virtualRows.value.length === 0) {
    return 0
  }
  const lastIndex = virtualRows.value[virtualRows.value.length - 1]!.index
  return Math.max(0, (allRows.value.length - 1 - lastIndex) * ROW_HEIGHT)
})

function blobLabel(value: Uint8Array): string {
  const preview = blobPreview(value)
  return `BLOB ${formatByteSize(preview.byteLength)} · ${preview.hex}${preview.truncated ? ' …' : ''}`
}

function rowidOf(row: unknown[]): number | null {
  return rowidIndex.value >= 0 ? Number(row[rowidIndex.value]) : null
}

function startEdit(rowIndex: number, colIndex: number, currentValue: unknown) {
  if (!canEdit.value) {
    return
  }
  editingCell.value = { rowIndex, colIndex }
  editValue.value = currentValue === null || currentValue === undefined ? '' : String(currentValue)
}

function commit(row: unknown[], column: string, value: SqlValue) {
  const rowid = rowidOf(row)
  if (!editingCell.value || !props.activeTable || rowid === null) {
    return
  }
  editingCell.value = null
  emit('updateCell', { table: props.activeTable, rowid, column, value })
}

function commitEdit(row: unknown[], column: string) {
  commit(row, column, editValue.value)
}

function setNull(row: unknown[], column: string) {
  commit(row, column, null)
}

function cancelEdit() {
  editingCell.value = null
}

function sortIcon(column: string): string {
  if (props.sort?.column !== column) {
    return 'i-lucide-chevrons-up-down'
  }
  return props.sort.direction === 'asc' ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
}
</script>

<template>
  <div class="flex flex-1 flex-col overflow-hidden bg-default">
    <div
      v-if="!result || result.columns.length === 0"
      class="flex flex-1 items-center justify-center text-sm text-muted"
    >
      No rows to show. Select a table in the sidebar or run a query.
    </div>

    <div
      v-else
      v-bind="containerProps"
      class="flex-1 overflow-auto"
    >
      <table class="w-full border-collapse text-left text-xs">
        <thead class="sticky top-0 select-none border-b border-default bg-elevated font-semibold text-muted">
          <tr>
            <th class="w-12 px-2 py-1.5 text-center font-mono text-dimmed">
              #
            </th>
            <th
              v-for="column in visibleColumns"
              :key="column.name"
              class="border-r border-default px-3 py-1.5 font-mono last:border-r-0"
            >
              <button
                v-if="sortable"
                type="button"
                class="inline-flex items-center gap-1 hover:text-highlighted"
                :aria-label="`Sort by ${column.name}`"
                @click="emit('sort', column.name)"
              >
                {{ column.name }}
                <UIcon
                  :name="sortIcon(column.name)"
                  class="size-3"
                  :class="sort?.column === column.name ? 'text-primary' : 'text-dimmed'"
                />
              </button>
              <span v-else>{{ column.name }}</span>
              <span
                v-if="columnTypes?.[column.name]"
                class="ml-1 font-normal text-[10px] uppercase text-dimmed"
              >{{ columnTypes[column.name] }}</span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-default font-mono text-default">
          <tr
            v-if="paddingTop > 0"
            :style="{ height: `${paddingTop}px` }"
            aria-hidden="true"
          />
          <tr
            v-for="{ data: row, index: rowIndex } in virtualRows"
            :key="rowIndex"
            class="transition-colors hover:bg-elevated/60"
            :class="{ 'bg-primary/10': selectedRowid !== null && selectedRowid !== undefined && rowidOf(row) === selectedRowid }"
          >
            <td class="px-2 py-1 text-center text-dimmed">
              <button
                v-if="canEdit"
                type="button"
                class="w-full select-none rounded hover:text-primary"
                :aria-label="`Select row ${(offset ?? 0) + rowIndex + 1}`"
                @click="emit('selectRow', rowidOf(row)!)"
              >
                {{ (offset ?? 0) + rowIndex + 1 }}
              </button>
              <span
                v-else
                class="select-none"
              >{{ (offset ?? 0) + rowIndex + 1 }}</span>
            </td>
            <td
              v-for="column in visibleColumns"
              :key="column.index"
              class="max-w-xs truncate border-r border-default px-3 py-1 last:border-r-0"
              :class="{ 'cursor-pointer': canEdit }"
              :title="canEdit ? 'Double-click to edit' : undefined"
              @dblclick="startEdit(rowIndex, column.index, row[column.index])"
            >
              <div
                v-if="editingCell?.rowIndex === rowIndex && editingCell?.colIndex === column.index"
                class="flex items-center gap-1"
              >
                <input
                  v-model="editValue"
                  class="w-full rounded border border-primary bg-default px-1.5 py-0.5 text-xs text-highlighted focus:outline-none"
                  :aria-label="`Edit ${column.name}`"
                  autofocus
                  @keydown.enter="commitEdit(row, column.name)"
                  @keydown.esc="cancelEdit"
                  @blur="commitEdit(row, column.name)"
                >
                <UButton
                  size="xs"
                  color="neutral"
                  variant="subtle"
                  label="NULL"
                  class="shrink-0"
                  @mousedown.prevent="setNull(row, column.name)"
                />
              </div>
              <span
                v-else-if="row[column.index] === null"
                class="font-sans text-[11px] italic text-dimmed"
              >NULL</span>
              <span
                v-else-if="isBlobValue(row[column.index])"
                class="text-[11px] text-dimmed"
                :title="`${blobPreview(row[column.index] as Uint8Array).byteLength} bytes`"
              >{{ blobLabel(row[column.index] as Uint8Array) }}</span>
              <span v-else>{{ row[column.index] }}</span>
            </td>
          </tr>
          <tr
            v-if="paddingBottom > 0"
            :style="{ height: `${paddingBottom}px` }"
            aria-hidden="true"
          />
        </tbody>
      </table>
    </div>

    <div
      v-if="result && result.rows.length > 0"
      class="flex h-9 items-center justify-between border-t border-default bg-elevated/40 px-4 text-xs text-muted"
    >
      <span>
        {{ result.rows.length }} rows shown<template v-if="result.rowCount > result.rows.length"> of {{ result.rowCount }}. Add a LIMIT to see the rest.</template>
      </span>
      <span v-if="canEdit">Click a row number to select it. Double-click a cell to edit it.</span>
    </div>
  </div>
</template>
