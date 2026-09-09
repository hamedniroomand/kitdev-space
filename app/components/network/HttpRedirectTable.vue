<script setup lang="ts">
import type { RedirectHop } from '#shared/utils/network/http-report'
import { describeRedirect } from '#shared/utils/network/http-report'

const props = defineProps<{
  hops: RedirectHop[]
}>()

const rows = computed(() => props.hops.map((hop, index) => ({
  index: index + 1,
  hop,
  note: describeRedirect(hop.status),
  // Set-Cookie holds every cookie of the hop. The Cookie Inspector reads it.
  headerRows: Object.entries(hop.headers ?? {}).map(([name, value]) => ({ name, value })),
})))
</script>

<template>
  <div
    v-if="rows.length"
    class="overflow-x-auto rounded-md border border-default"
  >
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-default">
          <th class="px-3 py-2 text-left font-medium text-highlighted">
            Hop
          </th>
          <th class="px-3 py-2 text-left font-medium text-highlighted">
            Status
          </th>
          <th class="px-3 py-2 text-left font-medium text-highlighted">
            Time
          </th>
          <th class="px-3 py-2 text-left font-medium text-highlighted">
            URL
          </th>
          <th class="px-3 py-2 text-left font-medium text-highlighted">
            Location
          </th>
          <th class="px-3 py-2 text-left font-medium text-highlighted">
            Note
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-default">
        <template
          v-for="row in rows"
          :key="`${row.index}-${row.hop.url}`"
        >
          <tr>
            <td class="px-3 py-2 font-mono text-highlighted">
              {{ row.index }}
            </td>
            <td class="px-3 py-2 font-mono text-highlighted">
              {{ row.hop.status }} {{ row.hop.statusText }}
            </td>
            <td class="px-3 py-2 font-mono text-muted">
              {{ row.hop.durationMs === undefined ? '—' : `${row.hop.durationMs} ms` }}
            </td>
            <td class="break-all px-3 py-2 font-mono text-highlighted">
              {{ row.hop.url }}
            </td>
            <td class="break-all px-3 py-2 font-mono text-muted">
              {{ row.hop.location || '—' }}
            </td>
            <td class="px-3 py-2 text-muted">
              <UBadge
                v-if="row.hop.loop"
                color="error"
                variant="subtle"
                icon="i-lucide-refresh-cw"
              >
                Loop
              </UBadge>
              <span v-else>{{ row.note || '—' }}</span>
            </td>
          </tr>
          <tr v-if="row.headerRows.length">
            <td
              colspan="6"
              class="px-3 pb-3"
            >
              <details class="text-xs">
                <summary class="cursor-pointer text-muted">
                  {{ row.headerRows.length }} response headers
                </summary>
                <dl class="mt-2 grid gap-1">
                  <div
                    v-for="header in row.headerRows"
                    :key="header.name"
                    class="flex flex-wrap gap-2"
                  >
                    <dt class="font-mono text-muted">
                      {{ header.name }}:
                    </dt>
                    <dd class="break-all font-mono text-highlighted">
                      {{ header.value }}
                    </dd>
                  </div>
                </dl>
              </details>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
  <p
    v-else
    class="text-sm text-muted"
  >
    No hops.
  </p>
</template>
