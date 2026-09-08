<script setup lang="ts">
import type { JsonTreeNode } from '#shared/utils/data/json-tree'
import { useClipboard, useVirtualList } from '@vueuse/core'
import { flattenJsonTree } from '#shared/utils/data/json-tree'

const props = defineProps<{
  data: unknown
}>()

const collapsed = ref<Record<string, boolean>>({})
const copiedPath = ref<string | null>(null)
const { copy } = useClipboard({ legacy: true })

const flatNodes = computed(() => {
  return flattenJsonTree(props.data, collapsed.value)
})

const { list, containerProps, wrapperProps } = useVirtualList(flatNodes, {
  itemHeight: 32,
  overscan: 10,
})

function isNodeCollapsed(node: JsonTreeNode): boolean {
  return collapsed.value[node.path] ?? (node.depth >= 2)
}

function toggleCollapse(path: string, currentCollapsed: boolean) {
  collapsed.value = {
    ...collapsed.value,
    [path]: !currentCollapsed,
  }
}

async function handleNodeClick(node: JsonTreeNode) {
  await copy(node.path)
  copiedPath.value = node.path
  setTimeout(() => {
    if (copiedPath.value === node.path) {
      copiedPath.value = null
    }
  }, 2000)
}
</script>

<template>
  <div class="space-y-2">
    <div
      v-if="copiedPath"
      class="flex items-center gap-2 rounded bg-primary/10 px-3 py-1 text-xs text-primary font-mono"
    >
      <UIcon name="i-lucide-check" class="size-3.5" />
      <span>Copied path: {{ copiedPath }}</span>
    </div>

    <div
      v-bind="containerProps"
      class="max-h-128 overflow-auto rounded-md border border-default bg-default font-mono text-sm"
      data-testid="json-tree-container"
    >
      <div v-bind="wrapperProps">
        <div
          v-for="item in list"
          :key="item.data.id"
          class="flex items-center gap-1.5 px-3 py-1 hover:bg-neutral/5 cursor-pointer select-none transition-colors"
          :style="{ paddingLeft: `${item.data.depth * 18 + 12}px`, height: '32px' }"
          data-testid="json-tree-node"
          :data-path="item.data.path"
          @click="handleNodeClick(item.data)"
        >
          <!-- Expand/collapse chevron -->
          <button
            v-if="item.data.hasChildren"
            type="button"
            class="flex size-4 items-center justify-center rounded hover:bg-neutral/10 text-muted"
            :aria-label="isNodeCollapsed(item.data) ? 'Expand node' : 'Collapse node'"
            @click.stop="toggleCollapse(item.data.path, isNodeCollapsed(item.data))"
          >
            <UIcon
              :name="isNodeCollapsed(item.data) ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
              class="size-3.5"
            />
          </button>
          <span v-else class="w-4" />

          <!-- Key / Index -->
          <span v-if="item.data.key !== undefined" class="font-semibold text-foreground">
            {{ item.data.key }}:
          </span>

          <!-- Type summary or primitive value -->
          <template v-if="item.data.type === 'object'">
            <span class="text-muted text-xs">
              { {{ item.data.childCount }} {{ item.data.childCount === 1 ? 'key' : 'keys' }} }
            </span>
          </template>
          <template v-else-if="item.data.type === 'array'">
            <span class="text-muted text-xs">
              [ {{ item.data.childCount }} {{ item.data.childCount === 1 ? 'item' : 'items' }} ]
            </span>
          </template>
          <template v-else-if="item.data.type === 'string'">
            <span class="text-success truncate max-w-xs">
              "{{ item.data.value }}"
            </span>
          </template>
          <template v-else-if="item.data.type === 'number'">
            <span class="text-info">
              {{ item.data.value }}
            </span>
          </template>
          <template v-else-if="item.data.type === 'boolean'">
            <span class="text-warning">
              {{ item.data.value }}
            </span>
          </template>
          <template v-else-if="item.data.type === 'null'">
            <span class="text-muted italic">
              null
            </span>
          </template>

          <span class="ml-auto text-[11px] text-muted opacity-40 hover:opacity-100 transition-opacity">
            {{ item.data.path }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
