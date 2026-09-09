<script setup lang="ts">
import type { AstTreeNode } from '#shared/utils/dev/ast'

const props = defineProps<{
  node: AstTreeNode
  selectedId: string | null
  /** Ids of the nodes with a matched type name. */
  matchIds?: Set<string>
  /** Ids of the branches to open, from a type search or the editor caret. */
  expandIds?: Set<string>
  depth?: number
}>()

const emit = defineEmits<{
  select: [node: AstTreeNode]
}>()

const level = computed(() => (props.depth ?? 0) + 1)
const item = useTemplateRef<HTMLElement>('item')
const open = ref(level.value <= 2)

const hasChildren = computed(() => props.node.children.length > 0)
const isSelected = computed(() => props.selectedId === props.node.id)
const isMatch = computed(() => props.matchIds?.has(props.node.id) ?? false)

/** One node holds the tab stop. The arrow keys move the focus inside the tree. */
const isTabStop = computed(() => isSelected.value || (!props.selectedId && level.value === 1))

const title = computed(() => {
  return props.node.label ? `${props.node.type} · ${props.node.label}` : props.node.type
})

const spanText = computed(() => {
  const { start, end } = props.node.span
  return `${start.line}:${start.column}–${end.line}:${end.column}`
})

// A type search or a caret move asks for a branch. This only opens a branch, so
// the user keeps control of the toggle.
watch(() => props.expandIds?.has(props.node.id) ?? false, (wanted) => {
  if (wanted) {
    open.value = true
  }
}, { immediate: true })

// Show the node that the caret selected. This does not take the focus, so the
// caret stays in the editor. The browser scrolls a node that has the focus, so
// a focused node needs no help here.
watch(isSelected, async (selected) => {
  if (!selected) {
    return
  }
  await nextTick()
  if (item.value && document.activeElement !== item.value) {
    item.value.scrollIntoView({ block: 'nearest' })
  }
})

function toggle() {
  if (hasChildren.value) {
    open.value = !open.value
  }
}

function selectNode() {
  emit('select', props.node)
}

/** Only the open branches are in the DOM, so document order is visible order. */
function visibleItems(): HTMLElement[] {
  const root = item.value?.closest('[role="tree"]')
  return root ? [...root.querySelectorAll<HTMLElement>('[role="treeitem"]')] : []
}

function moveFocus(step: number) {
  const items = visibleItems()
  const index = item.value ? items.indexOf(item.value) : -1
  items[index + step]?.focus()
}

function openOrNext() {
  if (hasChildren.value && !open.value) {
    open.value = true
    return
  }
  moveFocus(1)
}

function closeOrParent() {
  if (hasChildren.value && open.value) {
    open.value = false
    return
  }
  const parent = item.value?.parentElement?.closest<HTMLElement>('[role="treeitem"]')
  parent?.focus()
}
</script>

<template>
  <div
    ref="item"
    role="treeitem"
    :aria-label="title"
    :aria-expanded="hasChildren ? open : undefined"
    :aria-selected="isSelected"
    :aria-level="level"
    :tabindex="isTabStop ? 0 : -1"
    class="select-none rounded-md focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
    @click.stop="selectNode"
    @focus="selectNode"
    @keydown.down.stop.prevent="moveFocus(1)"
    @keydown.up.stop.prevent="moveFocus(-1)"
    @keydown.right.stop.prevent="openOrNext"
    @keydown.left.stop.prevent="closeOrParent"
    @keydown.enter.stop.prevent="selectNode"
    @keydown.space.stop.prevent="selectNode"
  >
    <div
      class="flex w-full items-start gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-elevated"
      :class="[
        isSelected ? 'bg-elevated ring-1 ring-primary' : '',
        isMatch ? 'bg-primary/10 ring-1 ring-primary/40' : '',
      ]"
    >
      <span
        aria-hidden="true"
        class="mt-0.5 w-4 shrink-0 cursor-pointer font-mono text-xs text-muted"
        @click.stop="toggle"
      >
        <template v-if="hasChildren">
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
    </div>

    <div
      v-if="open && hasChildren"
      role="group"
      class="ml-3 border-l border-default pl-2"
    >
      <AstTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :selected-id="selectedId"
        :match-ids="matchIds"
        :expand-ids="expandIds"
        :depth="level"
        @select="emit('select', $event)"
      />
    </div>
  </div>
</template>
