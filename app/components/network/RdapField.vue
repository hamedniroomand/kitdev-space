<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    value?: string
    /** True when the registry hides the value for privacy. */
    redacted?: boolean
  }>(),
  {
    value: undefined,
    redacted: false,
  },
)
</script>

<template>
  <div class="grid grid-cols-3 gap-1 py-1 border-b border-default last:border-b-0">
    <span class="text-muted">{{ label }}:</span>
    <span
      v-if="value"
      class="col-span-2 text-default font-mono break-all"
    >{{ value }}</span>
    <span
      v-else-if="redacted"
      class="col-span-2"
    >
      <UBadge
        size="xs"
        color="warning"
        variant="subtle"
        icon="i-lucide-shield"
      >
        Hidden for privacy
      </UBadge>
    </span>
    <span
      v-else
      class="col-span-2 text-muted"
    >Not in the registry record</span>
  </div>
</template>
