<script setup lang="ts">
import { computed, ref } from 'vue'
import type { QueryResult, SqlValue } from '../../../types/sqlite'

const props = defineProps<{
  result: QueryResult | null
  activeTable: string | null
  canEdit?: boolean
}>()

const emit = defineEmits<{
  updateCell: [payload: { table: string, rowid: number, column: string, value: SqlValue }]
}>()

const page = ref(1)
const pageSize = ref(50)

const editingCell = ref<{ rowIndex: number, colIndex: number } | null>(null)
const editValue = ref<string>('')

const totalRows = computed(() => props.result?.rows.length ?? 0)

const paginatedRows = computed(() => {
  if (!props.result) return []
  const start = (page.value - 1) * pageSize.value
  return props.result.rows.slice(start, start + pageSize.value)
})

function startEdit(rowIndex: number, colIndex: number, currentVal: unknown) {
  if (!props.canEdit || !props.activeTable) {
    return
  }
  editingCell.value = { rowIndex, colIndex }
  editValue.value = currentVal === null || currentVal === undefined ? '' : String(currentVal)
}

function commitEdit(tableRow: unknown[], colName: string) {
  if (!editingCell.value || !props.activeTable) {
    return
  }

  const rowid = Number(tableRow[0])
  emit('updateCell', {
    table: props.activeTable,
    rowid,
    column: colName,
    value: editValue.value
  })

  editingCell.value = null
}

function cancelEdit() {
  editingCell.value = null
}
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-900">
    <div
      v-if="!result || result.columns.length === 0"
      class="flex-1 flex items-center justify-center text-sm text-gray-400"
    >
      No query results. Run a query or select a table from the sidebar.
    </div>

    <div
      v-else
      class="flex-1 overflow-auto"
    >
      <table class="w-full text-left text-xs border-collapse">
        <thead class="sticky top-0 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700 select-none">
          <tr>
            <th class="w-12 px-2 py-1.5 text-center text-gray-400 font-mono">
              #
            </th>
            <th
              v-for="col in result.columns"
              :key="col"
              class="px-3 py-1.5 font-mono border-r border-gray-200 dark:border-gray-700 last:border-r-0"
            >
              {{ col }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-gray-800 text-gray-800 dark:text-gray-200 font-mono">
          <tr
            v-for="(row, rIndex) in paginatedRows"
            :key="rIndex"
            class="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors"
          >
            <td class="px-2 py-1 text-center text-gray-400 select-none">
              {{ (page - 1) * pageSize + rIndex + 1 }}
            </td>
            <td
              v-for="(cell, cIndex) in row"
              :key="cIndex"
              class="px-3 py-1 truncate max-w-xs border-r border-gray-100 dark:border-gray-800 last:border-r-0 cursor-pointer"
              @dblclick="startEdit(rIndex, cIndex, cell)"
            >
              <div
                v-if="editingCell?.rowIndex === rIndex && editingCell?.colIndex === cIndex"
                class="flex items-center"
              >
                <input
                  v-model="editValue"
                  class="w-full bg-white dark:bg-gray-950 border border-primary rounded px-1.5 py-0.5 text-xs text-gray-900 dark:text-gray-100 focus:outline-none"
                  autofocus
                  @keydown.enter="commitEdit(row, result.columns[cIndex]!)"
                  @keydown.esc="cancelEdit"
                  @blur="commitEdit(row, result.columns[cIndex]!)"
                >
              </div>
              <span
                v-else-if="cell === null"
                class="text-gray-400 italic font-sans text-[11px]"
              >NULL</span>
              <span v-else>{{ cell }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="result && totalRows > 0"
      class="h-10 px-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-950 text-xs text-gray-500"
    >
      <span>Total: {{ totalRows }} rows</span>
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-chevron-left"
          size="xs"
          color="neutral"
          variant="ghost"
          :disabled="page <= 1"
          @click="page--"
        />
        <span>Page {{ page }} of {{ Math.ceil(totalRows / pageSize) || 1 }}</span>
        <UButton
          icon="i-lucide-chevron-right"
          size="xs"
          color="neutral"
          variant="ghost"
          :disabled="page >= Math.ceil(totalRows / pageSize)"
          @click="page++"
        />
      </div>
    </div>
  </div>
</template>
