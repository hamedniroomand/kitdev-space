<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    value: string | number
    unit?: string
    description?: string
    color?: 'primary' | 'highlighted' | 'neutral' | 'success' | 'warning' | 'error'
    ariaLabel?: string
  }>(),
  {
    unit: undefined,
    description: undefined,
    color: 'highlighted',
    ariaLabel: undefined,
  },
)
</script>

<template>
  <div
    :aria-label="ariaLabel || label"
    class="p-3.5 rounded-xl border border-default bg-elevated/40 text-center flex flex-col justify-between"
  >
    <slot name="label">
      <span class="text-xs text-muted font-medium block truncate">{{ label }}</span>
    </slot>

    <slot>
      <div class="mt-1 flex items-baseline justify-center gap-1">
        <span
          class="text-2xl font-bold font-mono"
          :class="{
            'text-highlighted': color === 'highlighted',
            'text-primary': color === 'primary',
            'text-neutral': color === 'neutral',
            'text-success': color === 'success',
            'text-warning': color === 'warning',
            'text-error': color === 'error',
          }"
        >
          {{ typeof value === 'number' ? value.toLocaleString() : value }}
        </span>
        <span
          v-if="unit"
          class="text-xs font-mono text-muted"
        >
          {{ unit }}
        </span>
      </div>
    </slot>

    <slot name="description">
      <span
        v-if="description"
        class="mt-1 text-[11px] text-muted block truncate"
      >
        {{ description }}
      </span>
    </slot>
  </div>
</template>
