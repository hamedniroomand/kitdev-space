<script setup lang="ts">
import type { DatabaseObject, DatabaseObjectType, TableInfo } from '~/types/sqlite'

const props = defineProps<{
  tables: TableInfo[]
  activeTable: string | null
  objects?: DatabaseObject[]
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

const OBJECT_GROUPS: { type: DatabaseObjectType, label: string, icon: string }[] = [
  { type: 'view', label: 'Views', icon: 'i-lucide-eye' },
  { type: 'index', label: 'Indexes', icon: 'i-lucide-list-ordered' },
  { type: 'trigger', label: 'Triggers', icon: 'i-lucide-zap' },
]

const expandedGroups = ref<Record<string, boolean>>({})

const groupedObjects = computed(() => {
  const query = search.value.trim().toLowerCase()
  return OBJECT_GROUPS.map(group => ({
    ...group,
    items: (props.objects ?? []).filter(
      item => item.type === group.type && (!query || item.name.toLowerCase().includes(query)),
    ),
  })).filter(group => group.items.length > 0)
})
</script>

<template>
  <aside class="w-64 border-r border-default flex flex-col h-full bg-elevated/20">
    <div class="p-3 border-b border-default">
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
        class="p-4 text-center text-xs text-muted"
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
          :class="activeTable === table.name ? 'bg-primary/10 text-primary font-medium' : 'text-default hover:bg-elevated/50'"
          @click="emit('selectTable', table.name)"
        >
          <div class="flex items-center gap-2 truncate">
            <button
              class="text-muted hover:text-highlighted"
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
          class="pl-7 pr-2 py-1 space-y-0.5 text-xs text-muted"
        >
          <div
            v-for="col in table.columns"
            :key="col.cid"
            class="flex items-center justify-between py-0.5"
          >
            <span class="truncate">{{ col.name }}</span>
            <span class="text-[10px] font-mono text-muted uppercase">{{ col.type || 'ANY' }}</span>
          </div>
        </div>
      </div>

      <div
        v-for="group in groupedObjects"
        :key="group.type"
        class="rounded-lg overflow-hidden"
      >
        <button
          type="button"
          class="flex w-full items-center gap-2 px-2.5 py-1.5 text-sm text-default hover:bg-elevated/50 rounded"
          :aria-expanded="!!expandedGroups[group.type]"
          @click="expandedGroups[group.type] = !expandedGroups[group.type]"
        >
          <UIcon
            :name="expandedGroups[group.type] ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
            class="w-3.5 h-3.5 text-muted"
          />
          <UIcon
            :name="group.icon"
            class="w-4 h-4 flex-shrink-0"
          />
          <span class="truncate">{{ group.label }}</span>
          <UBadge
            :label="String(group.items.length)"
            size="xs"
            color="neutral"
            variant="soft"
            class="ml-auto"
          />
        </button>

        <ul
          v-if="expandedGroups[group.type]"
          class="pl-7 pr-2 py-1 space-y-0.5 text-xs text-muted"
        >
          <li
            v-for="item in group.items"
            :key="item.name"
            class="flex items-center justify-between py-0.5"
          >
            <span class="truncate font-mono">{{ item.name }}</span>
            <span
              v-if="item.tableName"
              class="text-[10px] text-dimmed"
            >{{ item.tableName }}</span>
          </li>
        </ul>
      </div>
    </div>
  </aside>
</template>
