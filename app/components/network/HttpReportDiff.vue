<script setup lang="ts">
import type { HttpReportDiff } from '#shared/utils/network/http-diff'

const props = defineProps<{
  diff: HttpReportDiff
}>()

const sections = computed(() => [
  {
    key: 'added',
    label: 'Added',
    icon: 'i-lucide-circle-plus',
    color: 'error' as const,
    rows: props.diff.added.map(item => ({
      key: item.id + item.header,
      title: item.title,
      header: item.header,
      detail: item.detail,
    })),
  },
  {
    key: 'resolved',
    label: 'Resolved',
    icon: 'i-lucide-circle-check',
    color: 'success' as const,
    rows: props.diff.resolved.map(item => ({
      key: item.id + item.header,
      title: item.title,
      header: item.header,
      detail: 'This problem is no longer in the report.',
    })),
  },
  {
    key: 'changed',
    label: 'Modified',
    icon: 'i-lucide-git-compare-arrows',
    color: 'warning' as const,
    rows: props.diff.changed.map(item => ({
      key: item.key,
      title: item.after.title,
      header: item.after.header,
      detail: `${item.before.level} → ${item.after.level}. Value: ${item.before.value ?? '—'} → ${item.after.value ?? '—'}`,
    })),
  },
])

const total = computed(() =>
  props.diff.added.length + props.diff.resolved.length + props.diff.changed.length,
)
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-3">
      <UBadge
        :color="diff.scoreDelta > 0 ? 'success' : diff.scoreDelta < 0 ? 'error' : 'neutral'"
        variant="subtle"
      >
        Score {{ diff.scoreDelta > 0 ? '+' : '' }}{{ diff.scoreDelta }}
      </UBadge>
      <p class="break-all font-mono text-sm text-muted">
        Prior report: {{ diff.previousUrl }} · {{ diff.previousCheckedAt }}
      </p>
    </div>

    <p
      v-if="total === 0"
      class="text-sm text-muted"
    >
      The findings are the same in both reports.
    </p>

    <template v-else>
      <section
        v-for="section in sections"
        :key="section.key"
        class="space-y-2"
      >
        <div class="flex items-center gap-2">
          <UBadge
            :color="section.color"
            :icon="section.icon"
            variant="subtle"
          >
            {{ section.label }}
          </UBadge>
          <p class="text-sm text-muted">
            {{ section.rows.length }}
          </p>
        </div>

        <ul
          v-if="section.rows.length"
          class="divide-y divide-default rounded-md border border-default"
        >
          <li
            v-for="row in section.rows"
            :key="row.key"
            class="space-y-1 px-3 py-3"
          >
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-sm font-medium text-highlighted">
                {{ row.title }}
              </p>
              <p class="font-mono text-xs text-muted">
                {{ row.header }}
              </p>
            </div>
            <p class="break-all text-sm text-muted">
              {{ row.detail }}
            </p>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
