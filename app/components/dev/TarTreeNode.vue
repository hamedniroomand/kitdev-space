<script setup lang="ts">
import type { TarTreeNode } from '#shared/utils/dev/tar'
import { formatBytes } from '#shared/utils/format'

const props = defineProps<{
  node: TarTreeNode
  selected: string[]
  activePath: string | null
  depth?: number
}>()

const emit = defineEmits<{
  select: [path: string]
  preview: [node: TarTreeNode]
  download: [path: string]
}>()

// A shallow archive opens on its own. A deep one stays closed, so the list stays short.
const open = ref((props.depth ?? 0) < 2)
const isDirectory = computed(() => props.node.type === 'directory')
</script>

<template>
  <div class="select-none">
    <div
      class="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-elevated"
      :class="activePath === node.path ? 'bg-elevated' : ''"
    >
      <button
        v-if="node.children.length"
        type="button"
        class="w-4 shrink-0 font-mono text-xs text-muted"
        :aria-expanded="open"
        :aria-label="`Toggle ${node.path}`"
        @click="open = !open"
      >
        {{ open ? '▾' : '▸' }}
      </button>
      <span
        v-else
        class="w-4 shrink-0"
      />

      <UCheckbox
        v-if="node.type === 'file'"
        :model-value="selected.includes(node.path)"
        :aria-label="`Select ${node.path}`"
        @update:model-value="emit('select', node.path)"
      />

      <UIcon
        :name="isDirectory ? 'i-lucide-folder' : 'i-lucide-file'"
        class="size-4 shrink-0 text-muted"
      />

      <button
        type="button"
        class="min-w-0 flex-1 truncate text-left font-mono text-highlighted"
        @click="isDirectory ? (open = !open) : emit('preview', node)"
      >
        {{ node.name }}
      </button>

      <span class="shrink-0 text-xs text-muted">
        {{ isDirectory ? '—' : formatBytes(node.size) }}
      </span>

      <UButton
        v-if="node.type === 'file'"
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-download"
        :aria-label="`Download ${node.path}`"
        @click="emit('download', node.path)"
      />
    </div>

    <div
      v-if="open && node.children.length"
      role="group"
      class="ml-3 border-l border-default pl-2"
    >
      <TarTreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :selected="selected"
        :active-path="activePath"
        :depth="(depth ?? 0) + 1"
        @select="emit('select', $event)"
        @preview="emit('preview', $event)"
        @download="emit('download', $event)"
      />
    </div>
  </div>
</template>
