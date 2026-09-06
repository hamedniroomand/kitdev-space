<script setup lang="ts">
import type { TableInfo } from '~/types/sqlite'

const props = defineProps<{
  tables: TableInfo[]
  activeTable: string | null
}>()

const emit = defineEmits<{
  selectTable: [table: string]
}>()

const search = ref('')
const expandedTables = ref<Record<string, boolean>>({})

const filteredTables = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) {
    return props.tables
  }
  return props.tables.filter(t => t.name.toLowerCase().includes(query))
})

function toggleExpand(name: string, event: Event) {
  event.stopPropagation()
  expandedTables.value[name] = !expandedTables.value[name]
}
</script>

<template>
  <aside class="w-64 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full bg-gray-50 dark:bg-gray-950">
    <div class="p-3 border-b border-gray-200 dark:border-gray-800">
      <UInput
        v-model="search"
        placeholder="Filter tables..."
        icon="i-lucide-search"
        size="xs"
      />
    </div>

    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      <div
        v-if="filteredTables.length === 0"
        class="p-4 text-center text-xs text-gray-400"
      >
        No tables found.
      </div>

      <div
        v-for="table in filteredTables"
        :key="table.name"
        class="rounded-lg overflow-hidden"
      >
        <div
          class="flex items-center justify-between px-2.5 py-1.5 text-sm cursor-pointer rounded transition-colors"
          :class="activeTable === table.name ? 'bg-primary/10 text-primary font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'"
          @click="emit('selectTable', table.name)"
        >
          <div class="flex items-center gap-2 truncate">
            <button
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              @click="toggleExpand(table.name, $event)"
            >
              <UIcon
                :name="expandedTables[table.name] ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                class="w-3.5 h-3.5"
              />
            </button>
            <UIcon
              name="i-lucide-table"
              class="w-4 h-4 flex-shrink-0"
            />
            <span class="truncate">{{ table.name }}</span>
          </div>

          <UBadge
            :label="String(table.rowCount)"
            size="xs"
            color="neutral"
            variant="soft"
          />
        </div>

        <div
          v-if="expandedTables[table.name]"
          class="pl-7 pr-2 py-1 space-y-0.5 text-xs text-gray-500 dark:text-gray-400"
        >
          <div
            v-for="col in table.columns"
            :key="col.cid"
            class="flex items-center justify-between py-0.5"
          >
            <span class="truncate">{{ col.name }}</span>
            <span class="text-[10px] font-mono text-gray-400 uppercase">{{ col.type || 'ANY' }}</span>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
