<script setup lang="ts">
import type { SpfTrace } from '#shared/utils/network/email-health'
import { computed } from 'vue'

const props = defineProps<{ trace: SpfTrace }>()

const lookupColor = computed(() => (props.trace.exceeded ? 'error' : 'highlighted'))
const voidColor = computed(() => (
  props.trace.voidLookupCount > props.trace.voidLookupLimit ? 'warning' : 'highlighted'
))

const NODE_COLOR = {
  ok: 'success',
  missing: 'warning',
  failed: 'error',
} as const
</script>

<template>
  <div class="space-y-3">
    <p class="text-sm font-medium text-highlighted">
      SPF trace
    </p>

    <div class="grid gap-3 sm:grid-cols-3">
      <StatCard
        label="DNS lookups"
        :value="`${trace.lookupCount} / ${trace.lookupLimit}`"
        :color="lookupColor"
        description="RFC 7208 limit"
      />
      <StatCard
        label="Void lookups"
        :value="`${trace.voidLookupCount} / ${trace.voidLookupLimit}`"
        :color="voidColor"
        description="Names with no record"
      />
      <StatCard
        label="Domains"
        :value="trace.nodes.length"
        description="include and redirect"
      />
    </div>

    <EmailIssueList :issues="trace.issues" />

    <ul class="divide-y divide-default rounded-md border border-default">
      <li
        v-for="node in trace.nodes"
        :key="`${node.depth}-${node.domain}`"
        class="space-y-1 px-3 py-2"
        :style="{ paddingLeft: `${12 + node.depth * 16}px` }"
      >
        <div class="flex flex-wrap items-center gap-2">
          <UBadge
            :color="NODE_COLOR[node.status]"
            variant="subtle"
          >
            {{ node.status }}
          </UBadge>
          <span class="font-mono text-sm text-highlighted">{{ node.domain }}</span>
          <UBadge
            v-if="node.via !== 'root'"
            color="neutral"
            variant="subtle"
          >
            {{ node.via }}
          </UBadge>
        </div>
        <p
          v-if="node.record"
          class="font-mono text-xs break-all text-muted"
        >
          {{ node.record }}
        </p>
      </li>
    </ul>

    <div class="grid gap-3 sm:grid-cols-2">
      <div class="rounded-md border border-default px-3 py-2">
        <p class="text-xs text-muted uppercase">
          IPv4 authorized ({{ trace.ipv4.length }})
        </p>
        <p class="mt-1 font-mono text-xs break-all text-highlighted">
          {{ trace.ipv4.join(', ') || '—' }}
        </p>
      </div>
      <div class="rounded-md border border-default px-3 py-2">
        <p class="text-xs text-muted uppercase">
          IPv6 authorized ({{ trace.ipv6.length }})
        </p>
        <p class="mt-1 font-mono text-xs break-all text-highlighted">
          {{ trace.ipv6.join(', ') || '—' }}
        </p>
      </div>
    </div>
  </div>
</template>
