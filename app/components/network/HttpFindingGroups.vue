<script setup lang="ts">
import type { FindingGroup, FindingSeverity } from '#shared/utils/network/security-headers'

defineProps<{
  groups: FindingGroup[]
}>()

const COLORS: Record<FindingSeverity, 'error' | 'warning' | 'info' | 'success'> = {
  critical: 'error',
  warning: 'warning',
  info: 'info',
  pass: 'success',
}

const ICONS: Record<FindingSeverity, string> = {
  critical: 'i-lucide-shield-alert',
  warning: 'i-lucide-triangle-alert',
  info: 'i-lucide-info',
  pass: 'i-lucide-shield-check',
}
</script>

<template>
  <div class="space-y-5">
    <section
      v-for="group in groups"
      :key="group.severity"
      class="space-y-2"
    >
      <div class="flex items-center gap-2">
        <UBadge
          :color="COLORS[group.severity]"
          :icon="ICONS[group.severity]"
          variant="subtle"
        >
          {{ group.label }}
        </UBadge>
        <p class="text-sm text-muted">
          {{ group.findings.length }} finding{{ group.findings.length === 1 ? '' : 's' }}
        </p>
      </div>

      <ul class="divide-y divide-default rounded-md border border-default">
        <li
          v-for="item in group.findings"
          :key="item.id + item.header"
          class="space-y-2 px-3 py-3"
        >
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-sm font-medium text-highlighted">
              {{ item.title }}
            </p>
            <p class="font-mono text-xs text-muted">
              {{ item.header }}
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
    </section>

    <p
      v-if="groups.length === 0"
      class="text-sm text-muted"
    >
      No findings.
    </p>
  </div>
</template>
