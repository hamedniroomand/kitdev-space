<script setup lang="ts">
import type { ColumnDataType, ColumnSchema } from '#shared/utils/data/csv-preview'
import { COLUMN_TYPE_OPTIONS } from '#shared/utils/data/csv-preview'

defineProps<{
  columns: ColumnSchema[]
  rows: string[][]
  totalRows: number
}>()

const emit = defineEmits<{
  updateType: [index: number, type: ColumnDataType]
}>()

function onTypeChange(index: number, newType: ColumnDataType) {
  emit('updateType', index, newType)
}
</script>

<template>
  <div
    v-if="columns.length > 0 && rows.length > 0"
    class="border border-default rounded-xl overflow-hidden bg-elevated/40"
  >
    <div class="flex items-center justify-between px-4 py-2.5 border-b border-default bg-muted/20">
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-table"
          class="w-4 h-4 text-primary"
        />
        <span class="text-xs font-medium text-highlighted">Table Preview</span>
        <span class="text-xs text-muted">
          (showing first {{ rows.length }} of {{ totalRows }} rows)
        </span>
      </div>
      <span class="text-xs text-muted">
        Select column data types before conversion
      </span>
    </div>

    <div class="overflow-x-auto max-h-[360px]">
      <table class="w-full text-left border-collapse text-xs">
        <thead class="sticky top-0 bg-elevated z-10 border-b border-default shadow-xs">
          <tr>
            <th
              v-for="(col, colIdx) in columns"
              :key="colIdx"
              class="p-2.5 font-medium min-w-[140px] border-r border-default/50 last:border-r-0"
            >
              <div class="flex flex-col gap-1.5">
                <span
                  class="font-mono text-highlighted truncate"
                  :title="col.name"
                >
                  {{ col.name }}
                </span>
                <USelect
                  :model-value="col.type"
                  :items="COLUMN_TYPE_OPTIONS"
                  size="xs"
                  class="w-full"
                  @update:model-value="(val) => onTypeChange(colIdx, val as ColumnDataType)"
                />
              </div>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-default/40">
          <tr
            v-for="(row, rowIdx) in rows"
            :key="rowIdx"
            class="hover:bg-muted/10 transition-colors"
          >
            <td
              v-for="(col, colIdx) in columns"
              :key="colIdx"
              class="p-2.5 font-mono text-muted truncate max-w-[200px] border-r border-default/30 last:border-r-0"
              :title="row[colIdx] ?? ''"
            >
              {{ row[colIdx] ?? '' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
