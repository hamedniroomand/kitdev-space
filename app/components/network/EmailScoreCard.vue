<script setup lang="ts">
import type { EmailScore } from '#shared/utils/network/email-health'
import { computed } from 'vue'

const props = defineProps<{ score: EmailScore }>()

const gradeColor = computed(() => {
  switch (props.score.grade) {
    case 'A':
      return 'success'
    case 'B':
    case 'C':
      return 'warning'
    default:
      return 'error'
  }
})
</script>

<template>
  <section class="space-y-3">
    <h2 class="text-sm font-medium text-highlighted">
      Score
    </h2>

    <div class="grid gap-3 sm:grid-cols-3">
      <StatCard
        label="Grade"
        :value="score.grade"
        :color="gradeColor"
        description="DNS records only"
      />
      <StatCard
        label="Points"
        :value="`${score.points} / ${score.max}`"
        description="Sum of the checks below"
      />
      <StatCard
        label="Percent"
        :value="score.percent"
        unit="%"
        description="Points divided by the maximum"
      />
    </div>

    <div class="overflow-x-auto rounded-md border border-default">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-default">
            <th class="px-3 py-2 text-left font-medium text-highlighted">
              Check
            </th>
            <th class="px-3 py-2 text-left font-medium text-highlighted">
              Points
            </th>
            <th class="px-3 py-2 text-left font-medium text-highlighted">
              Reason
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-default">
          <tr
            v-for="line in score.lines"
            :key="line.label"
          >
            <td class="px-3 py-2 text-highlighted">
              {{ line.label }}
            </td>
            <td class="px-3 py-2 font-mono whitespace-nowrap">
              <span :class="line.max === 0 ? 'text-muted' : line.points === line.max ? 'text-success' : line.points === 0 ? 'text-error' : 'text-warning'">
                {{ line.points }} / {{ line.max }}
              </span>
            </td>
            <td class="px-3 py-2 text-muted">
              {{ line.detail }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="text-sm text-muted">
      The grade rates the DNS records of the domain. It does not measure inbox placement, and it
      gives no delivery guarantee.
    </p>
  </section>
</template>
