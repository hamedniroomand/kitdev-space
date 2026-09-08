<script setup lang="ts">
import type { DiffLine } from '#shared/utils/data/diff'
import { onKeyStroke } from '@vueuse/core'
import {
  buildDiffViewItems,
  computeCollapsibleSections,
  findDiffChunks,
} from '#shared/utils/data/diff-view'

const props = defineProps<{
  lines: DiffLine[]
}>()

const expandedSections = ref(new Set<number>())
const activeChunkIndex = ref<number>(-1)

const chunks = computed(() => findDiffChunks(props.lines))
const collapsibleSections = computed(() => computeCollapsibleSections(props.lines, 3))

const allExpanded = computed(() => {
  if (collapsibleSections.value.length === 0) {
    return true
  }
  return collapsibleSections.value.every(s => expandedSections.value.has(s.id))
})

const viewItems = computed(() =>
  buildDiffViewItems(props.lines, expandedSections.value, 3),
)

const { list, containerProps, wrapperProps, scrollTo } = useVirtualList(
  viewItems,
  {
    itemHeight: 28,
    overscan: 12,
  },
)

function toggleExpandAll() {
  if (allExpanded.value) {
    expandedSections.value = new Set()
  }
  else {
    expandedSections.value = new Set(collapsibleSections.value.map(s => s.id))
  }
}

function expandSection(id: number) {
  const next = new Set(expandedSections.value)
  next.add(id)
  expandedSections.value = next
}

function scrollToChunk(chunkId: number) {
  const itemIndex = viewItems.value.findIndex(
    item => item.kind === 'line' && item.chunkId === chunkId,
  )
  if (itemIndex >= 0) {
    scrollTo(itemIndex)
  }
}

function goToNextChunk() {
  if (chunks.value.length === 0) {
    return
  }
  if (activeChunkIndex.value < chunks.value.length - 1) {
    activeChunkIndex.value++
  }
  else {
    activeChunkIndex.value = 0
  }
  const chunk = chunks.value[activeChunkIndex.value]
  if (chunk) {
    scrollToChunk(chunk.id)
  }
}

function goToPrevChunk() {
  if (chunks.value.length === 0) {
    return
  }
  if (activeChunkIndex.value > 0) {
    activeChunkIndex.value--
  }
  else {
    activeChunkIndex.value = chunks.value.length - 1
  }
  const chunk = chunks.value[activeChunkIndex.value]
  if (chunk) {
    scrollToChunk(chunk.id)
  }
}

function isInputFocused(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null
  return Boolean(
    target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable),
  )
}

onKeyStroke(['j', 'J'], (event) => {
  if (!isInputFocused(event)) {
    event.preventDefault()
    goToNextChunk()
  }
})

onKeyStroke(['k', 'K'], (event) => {
  if (!isInputFocused(event)) {
    event.preventDefault()
    goToPrevChunk()
  }
})

onKeyStroke('ArrowDown', (event) => {
  if (event.altKey && !isInputFocused(event)) {
    event.preventDefault()
    goToNextChunk()
  }
})

onKeyStroke('ArrowUp', (event) => {
  if (event.altKey && !isInputFocused(event)) {
    event.preventDefault()
    goToPrevChunk()
  }
})

function lineClass(type: DiffLine['type'], chunkId?: number) {
  const isActive = chunkId !== undefined && chunkId === activeChunkIndex.value
  const ring = isActive ? 'ring-1 ring-primary inset-0' : ''
  if (type === 'insert') {
    return `bg-success/15 text-success ${ring}`
  }
  if (type === 'delete') {
    return `bg-error/15 text-error ${ring}`
  }
  return `text-muted ${ring}`
}

function prefix(type: DiffLine['type']) {
  if (type === 'insert') {
    return '+'
  }
  if (type === 'delete') {
    return '-'
  }
  return ' '
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
      <div class="flex items-center gap-2">
        <span v-if="chunks.length > 0" class="font-medium text-muted">
          {{ activeChunkIndex >= 0 ? `Change ${activeChunkIndex + 1} of ${chunks.length}` : `${chunks.length} ${chunks.length === 1 ? 'change' : 'changes'}` }}
        </span>
        <span v-else class="text-muted">
          No changes
        </span>
        <UButton
          size="xs"
          color="neutral"
          variant="subtle"
          icon="i-lucide-arrow-up"
          label="Previous"
          :disabled="chunks.length === 0"
          @click="goToPrevChunk"
        />
        <UButton
          size="xs"
          color="neutral"
          variant="subtle"
          icon="i-lucide-arrow-down"
          label="Next"
          :disabled="chunks.length === 0"
          @click="goToNextChunk"
        />
      </div>

      <div v-if="collapsibleSections.length > 0" class="flex items-center gap-2">
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          :icon="allExpanded ? 'i-lucide-fold-vertical' : 'i-lucide-unfold-vertical'"
          :label="allExpanded ? 'Collapse unchanged' : 'Expand all'"
          @click="toggleExpandAll"
        />
      </div>
    </div>

    <div
      v-bind="containerProps"
      class="max-h-128 overflow-auto rounded-md border border-default bg-default font-mono text-sm"
    >
      <div v-bind="wrapperProps">
        <template v-for="item in list" :key="item.index">
          <div
            v-if="item.data.kind === 'collapsed'"
            class="flex items-center justify-center border-y border-dashed border-default bg-muted/20 px-3 hover:bg-muted/40 transition-colors"
            :style="{ height: '28px' }"
          >
            <button
              type="button"
              class="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground cursor-pointer font-sans"
              @click="expandSection(item.data.id)"
            >
              <UIcon name="i-lucide-unfold-vertical" class="size-3.5" />
              <span>Expand {{ item.data.count }} unchanged lines</span>
            </button>
          </div>

          <div
            v-else
            class="flex min-w-max gap-2 px-3 leading-7"
            :class="lineClass(item.data.line.type, item.data.chunkId)"
            :style="{ height: '28px' }"
          >
            <span class="w-14 shrink-0 select-none text-right opacity-60">
              {{ item.data.line.oldLine ?? '' }}
            </span>
            <span class="w-14 shrink-0 select-none text-right opacity-60">
              {{ item.data.line.newLine ?? '' }}
            </span>
            <span class="w-5 shrink-0 select-none">
              {{ prefix(item.data.line.type) }}
            </span>
            <span
              v-if="item.data.line.spans && item.data.line.spans.length > 0"
              class="whitespace-pre"
            >
              <template v-for="(span, sIdx) in item.data.line.spans" :key="sIdx">
                <mark
                  v-if="span.type === 'delete'"
                  class="rounded bg-error/30 px-0.5 font-semibold text-error"
                >{{ span.text }}</mark>
                <mark
                  v-else-if="span.type === 'insert'"
                  class="rounded bg-success/30 px-0.5 font-semibold text-success"
                >{{ span.text }}</mark>
                <span v-else>{{ span.text }}</span>
              </template>
            </span>
            <span v-else class="whitespace-pre">{{ item.data.line.text }}</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
