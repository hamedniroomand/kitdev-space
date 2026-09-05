<script setup lang="ts">
const model = defineModel<string>({ default: '' })

const props = withDefaults(defineProps<{
  label: string
  readonly?: boolean
  placeholder?: string
  rows?: number
}>(), {
  rows: 12
})

const [expanded, toggleExpanded] = useToggle(false)

const rowCount = computed(() => (
  expanded.value
    ? Math.max(props.rows * 2, 24)
    : props.rows
))
</script>

<template>
  <ClientOnly>
    <UFormField :label="label">
      <div class="relative">
        <UTextarea
          v-model="model"
          :readonly="readonly"
          :placeholder="placeholder"
          :rows="rowCount"
          class="w-full font-mono text-sm"
          :ui="{
            base: 'font-mono overflow-auto pe-10 resize-none'
          }"
        />
        <UButton
          class="absolute inset-e-1.5 top-1.5 z-10"
          size="xs"
          color="neutral"
          variant="soft"
          square
          :icon="expanded ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'"
          :aria-label="expanded ? 'Collapse editor' : 'Expand editor'"
          @click="toggleExpanded()"
        />
      </div>
    </UFormField>
    <template #fallback>
      <UFormField :label="label">
        <div
          class="min-h-48 rounded-md bg-elevated ring ring-inset ring-accented"
          aria-hidden="true"
        />
      </UFormField>
    </template>
  </ClientOnly>
</template>
