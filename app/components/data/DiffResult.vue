<script setup lang="ts">
import type { DiffLine } from '~~/shared/utils/data/diff'

const props = defineProps<{
  lines: DiffLine[]
}>()

const { list, containerProps, wrapperProps } = useVirtualList(
  computed(() => props.lines),
  {
    itemHeight: 28,
    overscan: 12
  }
)

function lineClass(type: DiffLine['type']) {
  if (type === 'insert') {
    return 'bg-success/15 text-success'
  }
  if (type === 'delete') {
    return 'bg-error/15 text-error'
  }
  return 'text-muted'
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
  <div
    v-bind="containerProps"
    class="max-h-128 overflow-auto rounded-md border border-default bg-default font-mono text-sm"
  >
    <div v-bind="wrapperProps">
      <div
        v-for="item in list"
        :key="item.index"
        class="flex min-w-max gap-2 px-3 leading-7"
        :class="lineClass(item.data.type)"
        :style="{ height: '28px' }"
      >
        <span class="w-14 shrink-0 select-none text-right opacity-60">
          {{ item.data.oldLine ?? '' }}
        </span>
        <span class="w-14 shrink-0 select-none text-right opacity-60">
          {{ item.data.newLine ?? '' }}
        </span>
        <span class="w-5 shrink-0 select-none">
          {{ prefix(item.data.type) }}
        </span>
        <span class="whitespace-pre">{{ item.data.text }}</span>
      </div>
    </div>
  </div>
</template>
