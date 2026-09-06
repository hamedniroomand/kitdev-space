<script setup lang="ts">
import type { AstTreeNode } from '#shared/utils/dev/ast'

defineProps<{
  node: AstTreeNode
  snippet: string
}>()
</script>

<template>
  <div class="space-y-2 rounded-md border border-default p-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-sm font-medium text-highlighted">
        Selected · {{ node.type }}
        <span
          v-if="node.label"
          class="text-muted"
        >· {{ node.label }}</span>
      </p>
      <p class="font-mono text-xs text-muted">
        {{ node.span.start.line }}:{{ node.span.start.column }}
        –
        {{ node.span.end.line }}:{{ node.span.end.column }}
        ({{ node.start }}–{{ node.end }})
      </p>
    </div>
    <pre class="overflow-x-auto rounded-md bg-elevated p-3 font-mono text-sm text-highlighted">{{ snippet || ' ' }}</pre>
  </div>
</template>
