<script setup lang="ts">
import type { TlsCheck } from '#shared/utils/network/tls-report'
import { computed } from 'vue'
import { checkColor, checkIcon } from '#shared/utils/network/tls-report'

const props = defineProps<{
  check: TlsCheck
}>()

const color = computed(() => checkColor(props.check.state))
const icon = computed(() => checkIcon(props.check.state))
</script>

<template>
  <div class="p-4 rounded-xl border border-default bg-elevated/20 space-y-2">
    <div class="flex items-center gap-2">
      <UIcon
        :name="icon"
        class="w-5 h-5 shrink-0"
        :class="{
          'text-success': color === 'success',
          'text-warning': color === 'warning',
          'text-error': color === 'error',
        }"
      />
      <h3 class="text-sm font-semibold text-default">
        {{ check.title }}
      </h3>
    </div>

    <p class="text-xs text-muted break-words">
      {{ check.summary }}
    </p>

    <slot />
  </div>
</template>
