<script setup lang="ts">
import type { TableInfo } from '~/types/sqlite'
import type { FilterOperator, TableFilter, TableQueryState } from '~/utils/sqlite/query-builder'
import { FILTER_OPERATORS, filterLabel, PAGE_SIZES } from '~/utils/sqlite/query-builder'

/**
 * Visual controls for the active table: search, filters, sort state, page
 * size, paging, and row actions. Every control patches the query state, and
 * the composable turns that state into the SQL in the editor.
 */
const props = defineProps<{
  table: TableInfo
  state: TableQueryState
  total: number | null
  shownRows: number
  custom: boolean
  selectedRowid: number | null
  busy?: boolean
}>()

const emit = defineEmits<{
  update: [patch: Partial<TableQueryState>]
  addRow: []
  duplicateRow: []
  deleteRow: []
  showSchema: []
  backToTable: []
}>()

const search = ref(props.state.search)
watch(() => props.state.search, (value) => {
  search.value = value
})
watchDebounced(search, (value) => {
  if (value !== props.state.search) {
    emit('update', { search: value })
  }
}, { debounce: 300 })

const columnItems = computed(() => props.table.columns.map(column => ({ label: column.name, value: column.name })))
const operatorItems = FILTER_OPERATORS.map(operator => ({ label: operator.label, value: operator.value }))
const pageSizeItems = PAGE_SIZES.map(size => ({ label: `${size} rows`, value: size }))

const filterOpen = ref(false)
const draft = reactive<TableFilter>({ column: props.table.columns[0]?.name ?? '', operator: 'eq', value: '' })
const draftNeedsValue = computed(() => FILTER_OPERATORS.find(operator => operator.value === draft.operator)?.needsValue ?? true)

watch(() => props.table.name, () => {
  draft.column = props.table.columns[0]?.name ?? ''
  draft.operator = 'eq'
  draft.value = ''
})

function addFilter() {
  if (!draft.column) {
    return
  }
  emit('update', { filters: [...props.state.filters, { column: draft.column, operator: draft.operator as FilterOperator, value: draftNeedsValue.value ? draft.value : '' }] })
  draft.value = ''
  filterOpen.value = false
}

function removeFilter(index: number) {
  emit('update', { filters: props.state.filters.filter((_, i) => i !== index) })
}

function clearAll() {
  search.value = ''
  emit('update', { search: '', filters: [], sort: null })
}

const pageStart = computed(() => (props.shownRows ? props.state.offset + 1 : 0))
const pageEnd = computed(() => props.state.offset + props.shownRows)
const hasPrevious = computed(() => props.state.offset > 0)
const hasNext = computed(() => props.total !== null && pageEnd.value < props.total)

// Deleting a row takes two clicks. The first click arms the button for a few seconds.
const armed = ref(false)
const { start: startDisarm } = useTimeoutFn(() => {
  armed.value = false
}, 3000, { immediate: false })

function handleDelete() {
  if (!armed.value) {
    armed.value = true
    startDisarm()
    return
  }
  armed.value = false
  emit('deleteRow')
}

watch(() => props.selectedRowid, () => {
  armed.value = false
})
</script>

<template>
  <div class="space-y-2 border-b border-default bg-elevated/40 px-3 py-2 text-xs">
    <div
      v-if="custom"
      class="flex flex-wrap items-center justify-between gap-2"
    >
      <span class="text-muted">
        The editor holds a custom query. The filters and the row actions apply to the table view.
      </span>
      <UButton
        size="xs"
        color="neutral"
        variant="subtle"
        icon="i-lucide-table"
        :label="`Back to ${table.name}`"
        @click="emit('backToTable')"
      />
    </div>

    <template v-else>
      <div class="flex flex-wrap items-center gap-2">
        <UInput
          v-model="search"
          size="xs"
          icon="i-lucide-search"
          placeholder="Search text columns"
          class="w-56"
          aria-label="Search text columns"
        />

        <UPopover v-model:open="filterOpen">
          <UButton
            size="xs"
            color="neutral"
            variant="subtle"
            icon="i-lucide-filter"
            label="Add filter"
          />
          <template #content>
            <form
              class="w-72 space-y-3 p-3"
              @submit.prevent="addFilter"
            >
              <UFormField label="Column">
                <USelect
                  v-model="draft.column"
                  :items="columnItems"
                  size="sm"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="Condition">
                <USelect
                  v-model="draft.operator"
                  :items="operatorItems"
                  size="sm"
                  class="w-full"
                />
              </UFormField>
              <UFormField
                v-if="draftNeedsValue"
                label="Value"
              >
                <UInput
                  v-model="draft.value"
                  size="sm"
                  class="w-full"
                  placeholder="A number compares as a number"
                />
              </UFormField>
              <UButton
                type="submit"
                size="sm"
                label="Add filter"
                icon="i-lucide-plus"
                block
              />
            </form>
          </template>
        </UPopover>

        <USelect
          :model-value="state.limit"
          :items="pageSizeItems"
          size="xs"
          class="w-28"
          aria-label="Rows per page"
          @update:model-value="emit('update', { limit: Number($event) })"
        />

        <div class="flex items-center gap-1 text-muted">
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-chevron-left"
            aria-label="Previous page"
            :disabled="!hasPrevious || busy"
            @click="emit('update', { offset: Math.max(0, state.offset - state.limit) })"
          />
          <span class="font-mono tabular-nums">
            {{ pageStart }}–{{ pageEnd }}<template v-if="total !== null"> of {{ total }}</template>
          </span>
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-chevron-right"
            aria-label="Next page"
            :disabled="!hasNext || busy"
            @click="emit('update', { offset: state.offset + state.limit })"
          />
        </div>

        <div class="ml-auto flex flex-wrap items-center gap-1">
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-plus"
            label="Add row"
            :disabled="busy"
            @click="emit('addRow')"
          />
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-copy"
            label="Duplicate"
            :disabled="selectedRowid === null || busy"
            @click="emit('duplicateRow')"
          />
          <UButton
            size="xs"
            :color="armed ? 'error' : 'neutral'"
            :variant="armed ? 'solid' : 'ghost'"
            icon="i-lucide-trash-2"
            :label="armed ? 'Confirm delete' : 'Delete'"
            :disabled="selectedRowid === null || busy"
            @click="handleDelete"
          />
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-file-code"
            label="Schema"
            @click="emit('showSchema')"
          />
        </div>
      </div>

      <div
        v-if="state.filters.length || state.sort"
        class="flex flex-wrap items-center gap-2"
      >
        <UBadge
          v-for="(filter, index) in state.filters"
          :key="`${filter.column}-${filter.operator}-${index}`"
          color="primary"
          variant="subtle"
          class="gap-1 font-mono"
        >
          {{ filterLabel(filter) }}
          <button
            type="button"
            class="ml-1 rounded hover:text-highlighted"
            :aria-label="`Remove filter ${filterLabel(filter)}`"
            @click="removeFilter(index)"
          >
            <UIcon
              name="i-lucide-x"
              class="size-3"
            />
          </button>
        </UBadge>
        <UBadge
          v-if="state.sort"
          color="neutral"
          variant="subtle"
          class="gap-1 font-mono"
        >
          sort {{ state.sort.column }} {{ state.sort.direction }}
          <button
            type="button"
            class="ml-1 rounded hover:text-highlighted"
            aria-label="Remove the sort"
            @click="emit('update', { sort: null })"
          >
            <UIcon
              name="i-lucide-x"
              class="size-3"
            />
          </button>
        </UBadge>
        <UButton
          size="xs"
          color="neutral"
          variant="link"
          label="Clear all"
          @click="clearAll"
        />
      </div>
    </template>
  </div>
</template>
