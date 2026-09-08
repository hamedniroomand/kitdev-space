<script setup lang="ts">
import { computed } from 'vue'
import { useCopyFeedback } from '../../composables/useCopyFeedback'

const props = withDefaults(
  defineProps<{
    label: string
    value?: string | number | null
    copyValue?: string
    copyable?: boolean
    active?: boolean
    description?: string
  }>(),
  {
    value: '',
    copyValue: undefined,
    copyable: true,
    active: false,
    description: undefined,
  },
)

const emit = defineEmits<{
  copy: [value: string]
}>()

const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

const displayValue = computed(() => {
  if (props.value === null || props.value === undefined || props.value === '') {
    return '—'
  }
  return String(props.value)
})

const textToCopy = computed(() => {
  if (props.copyValue !== undefined) {
    return props.copyValue
  }
  if (props.value !== null && props.value !== undefined) {
    return String(props.value)
  }
  return ''
})

async function handleCopy() {
  if (!textToCopy.value) {
    return
  }
  await copy(textToCopy.value, props.label)
  emit('copy', textToCopy.value)
}
</script>

<template>
  <div
    class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[12px] border border-default bg-elevated p-4 transition-colors"
    :class="{ 'ring-1 ring-primary/40': active }"
  >
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <slot name="label">
          <p class="font-mono text-xs font-medium text-muted uppercase">
            {{ label }}
          </p>
        </slot>
        <span
          v-if="description"
          class="text-xs text-muted"
        >
          {{ description }}
        </span>
      </div>
      <slot>
        <p class="mt-1 font-mono text-sm break-all text-highlighted">
          {{ displayValue }}
        </p>
      </slot>
    </div>

    <slot name="actions">
      <UButton
        v-if="copyable"
        :label="copyLabel(label)"
        size="xs"
        :color="copyColor(label)"
        variant="subtle"
        :icon="copyIcon(label)"
        :disabled="!textToCopy"
        :aria-label="`Copy ${label}`"
        @click="handleCopy"
      />
    </slot>
  </div>
</template>
