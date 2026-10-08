<script setup lang="ts">
import type { Tool } from '#shared/types/tools'
import { toolRunBadge } from '#shared/utils/tool-badges'

const tool = inject<ComputedRef<Tool> | undefined>('currentTool', undefined)

const badge = computed(() => {
  const current = tool?.value
  return current ? toolRunBadge(current, { includeMixed: true }) : undefined
})
</script>

<template>
  <UBadge
    v-if="badge"
    :color="badge.color"
    :variant="badge.variant"
    :size="badge.size"
    :label="badge.label"
    class="mt-3"
  />
</template>
