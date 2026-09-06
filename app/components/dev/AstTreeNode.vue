<script setup lang="ts">
import type { AstTreeNode } from '~~/shared/utils/dev/ast'

const props = defineProps<{
  node: AstTreeNode
  selectedId: string | null
  depth?: number
}>()

const emit = defineEmits<{
  select: [node: AstTreeNode]
}>()

const open = ref((props.depth ?? 0) < 2)

const title = computed(() => {
  return props.node.label ? `${props.node.type} · ${props.node.label}` : props.node.type
})

const spanText = computed(() => {
  const { start, end } = props.node.span
  return `${start.line}:${start.column}–${end.line}:${end.column}`
})

function toggle() {
  if (props.node.children.length) {
    open.value = !open.value
  }
}

function selectNode() {
  emit('select', props.node)
}
</script>

<template>
  <div class="select-none">
    <button
      type="button"
      class="flex w-full items-start gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-elevated"
      :class="selectedId === node.id ? 'bg-elevated ring-1 ring-primary' : ''"
      @click="selectNode"
    >
      <span
        class="mt-0.5 w-4 shrink-0 font-mono text-xs text-muted"
        @click.stop="toggle"
      >
        <template v-if="node.children.length">
          {{ open ? '▾' : '▸' }}
        </template>
        <template v-else>
          ·
        </template>
      </span>
      <span class="min-w-0 flex-1">
        <span class="font-mono text-highlighted">{{ title }}</span>
        <span class="ml-2 font-mono text-xs text-muted">{{ spanText }}</span>
      </span>
    </button>

    <div
      v-if="open && node.children.length"
      class="ml-3 border-l border-default pl-2"
    >
      <DevAstTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :selected-id="selectedId"
        :depth="(depth ?? 0) + 1"
        @select="emit('select', $event)"
      />
    </div>
  </div>
</template>
