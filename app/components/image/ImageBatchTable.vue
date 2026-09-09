<script setup lang="ts">
import type { ImageBatchRow } from '~/utils/image/batch-process'
import { formatBytes } from '#shared/utils/format'

/** The size of each file in a batch, before and after the run. */
defineProps<{
  rows: ImageBatchRow[]
}>()
</script>

<template>
  <div class="overflow-x-auto rounded-md border border-default">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-default">
          <th class="px-3 py-2 text-left font-medium text-highlighted">
            File
          </th>
          <th class="px-3 py-2 text-right font-medium text-highlighted">
            Original
          </th>
          <th class="px-3 py-2 text-right font-medium text-highlighted">
            Result
          </th>
          <th class="px-3 py-2 text-right font-medium text-highlighted">
            Change
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-default">
        <tr
          v-for="row in rows"
          :key="row.name"
        >
          <td class="px-3 py-2 font-mono text-highlighted">
            {{ row.name }}
          </td>
          <td class="px-3 py-2 text-right text-muted">
            {{ formatBytes(row.inputBytes) }}
          </td>
          <td class="px-3 py-2 text-right text-muted">
            {{ row.outputBytes == null ? '—' : formatBytes(row.outputBytes) }}
          </td>
          <td class="px-3 py-2 text-right">
            <span
              v-if="row.error"
              class="text-error"
            >{{ row.error }}</span>
            <span
              v-else-if="row.delta != null"
              class="text-muted"
            >{{ row.delta > 0 ? `−${row.delta}%` : row.delta < 0 ? `+${Math.abs(row.delta)}%` : '0%' }}</span>
            <span v-else>—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
