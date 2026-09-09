<script setup lang="ts">
import type { HealthIssue, HealthLevel } from '#shared/utils/network/email-health'

defineProps<{ issues: HealthIssue[] }>()

const LEVEL_COLOR: Record<HealthLevel, 'success' | 'info' | 'warning' | 'error'> = {
  ok: 'success',
  info: 'info',
  warning: 'warning',
  error: 'error',
}

function levelLabel(issue: HealthIssue) {
  return issue.level === 'ok' ? 'OK' : issue.level
}
</script>

<template>
  <ul
    v-if="issues.length"
    class="space-y-2"
  >
    <li
      v-for="(issue, index) in issues"
      :key="`${index}-${issue.code}`"
      class="rounded-md border border-default px-3 py-2"
    >
      <div class="flex flex-wrap items-center gap-2">
        <UBadge
          :color="LEVEL_COLOR[issue.level]"
          variant="subtle"
          class="capitalize"
        >
          {{ levelLabel(issue) }}
        </UBadge>
        <p class="text-sm text-highlighted">
          {{ issue.message }}
        </p>
      </div>

      <dl
        v-if="issue.observed || issue.impact || issue.fix"
        class="mt-2 space-y-1 text-sm"
      >
        <div
          v-if="issue.observed"
          class="flex flex-col gap-0.5 sm:flex-row sm:gap-2"
        >
          <dt class="shrink-0 text-xs font-medium text-muted uppercase sm:w-20">
            Observed
          </dt>
          <dd class="font-mono text-xs break-all text-toned">
            {{ issue.observed }}
          </dd>
        </div>
        <div
          v-if="issue.impact"
          class="flex flex-col gap-0.5 sm:flex-row sm:gap-2"
        >
          <dt class="shrink-0 text-xs font-medium text-muted uppercase sm:w-20">
            Impact
          </dt>
          <dd class="text-muted">
            {{ issue.impact }}
          </dd>
        </div>
        <div
          v-if="issue.fix"
          class="flex flex-col gap-0.5 sm:flex-row sm:gap-2"
        >
          <dt class="shrink-0 text-xs font-medium text-muted uppercase sm:w-20">
            Fix
          </dt>
          <dd class="text-muted">
            {{ issue.fix }}
          </dd>
        </div>
      </dl>
    </li>
  </ul>
</template>
