<script setup lang="ts">
import type { ColumnDataType, ColumnSchema } from '#shared/utils/data/csv-preview'
import { COLUMN_TYPE_OPTIONS } from '#shared/utils/data/csv-preview'

const props = defineProps<{
  fileName: string
  table: string
  columns: ColumnSchema[]
  rows: string[][]
}>()

const emit = defineEmits<{
  cancel: []
  confirm: [table: string, columns: ColumnSchema[]]
}>()

const open = ref(true)
const tableName = ref(props.table)
const columns = ref<ColumnSchema[]>(props.columns.map(column => ({ ...column })))

const previewRows = computed(() => props.rows.slice(0, 20))

function setType(index: number, type: ColumnDataType) {
  const column = columns.value[index]
  if (column) {
    column.type = type
  }
}

function handleConfirm() {
  open.value = false
  emit('confirm', tableName.value.trim() || 'imported', columns.value)
}

function handleCancel() {
  open.value = false
  emit('cancel')
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Import ${props.fileName}`"
    :description="`${props.rows.length} rows and ${props.columns.length} columns. Set the type of each column, then import.`"
    :ui="{ content: 'max-w-4xl' }"
    @update:open="!$event && handleCancel()"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField label="Table name">
          <UInput
            v-model="tableName"
            class="font-mono"
            aria-label="Name of the new table"
          />
        </UFormField>

        <div class="overflow-x-auto border border-default rounded-lg">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-elevated/40 border-b border-default">
              <tr>
                <th
                  v-for="(column, idx) in columns"
                  :key="column.name"
                  class="p-2 align-top border-r border-default last:border-r-0"
                >
                  <div class="space-y-1">
                    <div class="font-mono font-semibold text-default">
                      {{ column.name }}
                    </div>
                    <USelect
                      :model-value="column.type"
                      :items="COLUMN_TYPE_OPTIONS"
                      size="xs"
                      :aria-label="`Data type of ${column.name}`"
                      @update:model-value="setType(idx, $event as ColumnDataType)"
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default font-mono">
              <tr
                v-for="(row, rowIdx) in previewRows"
                :key="rowIdx"
              >
                <td
                  v-for="(column, colIdx) in columns"
                  :key="column.name"
                  class="p-2 border-r border-default last:border-r-0 max-w-48 truncate text-muted"
                >
                  {{ row[colIdx] }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="text-xs text-muted">
          The import creates the table and inserts every row inside one transaction. Nothing is
          written when a row fails.
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          @click="handleCancel"
        />
        <UButton
          :label="`Import ${props.rows.length} rows`"
          color="primary"
          icon="i-lucide-database"
          @click="handleConfirm"
        />
      </div>
    </template>
  </UModal>
</template>
