<script setup lang="ts">
import type { OgFinding, OgFindingLevel } from '#shared/utils/network/og-meta'

defineProps<{
  findings: OgFinding[]
}>()

const COLORS: Record<OgFindingLevel, 'error' | 'warning' | 'info' | 'success'> = {
  error: 'error',
  warning: 'warning',
  info: 'info',
  ok: 'success',
}

const ICONS: Record<OgFindingLevel, string> = {
  error: 'i-lucide-circle-x',
  warning: 'i-lucide-triangle-alert',
  info: 'i-lucide-info',
  ok: 'i-lucide-circle-check',
}
</script>

<template>
  <ul class="divide-y divide-default rounded-md border border-default">
    <li
      v-for="item in findings"
      :key="item.id"
      class="space-y-1 px-3 py-3"
    >
      <div class="flex flex-wrap items-center gap-2">
        <UBadge
          :color="COLORS[item.level]"
          :icon="ICONS[item.level]"
          variant="subtle"
          size="sm"
        >
          {{ item.tag }}
        </UBadge>
        <p class="text-sm font-medium text-highlighted">
          {{ item.title }}
        </p>
      </div>
      <p class="break-all text-sm text-muted">
        {{ item.detail }}
      </p>
      <p
        v-if="item.fix"
        class="text-sm text-highlighted"
      >
        Fix: {{ item.fix }}
      </p>
    </li>
  </ul>
</template>
