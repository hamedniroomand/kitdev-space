<script setup lang="ts">
import type { DataFormat } from '#shared/utils/data/types'

const from = defineModel<Exclude<DataFormat, 'typescript'>>('from', { required: true })
const to = defineModel<Exclude<DataFormat, 'typescript'>>('to', { required: true })

const props = defineProps<{
  formats: { label: string, value: Exclude<DataFormat, 'typescript'> }[]
}>()

function swap() {
  const previousFrom = from.value
  from.value = to.value
  to.value = previousFrom
}
</script>

<template>
  <div class="flex flex-wrap items-end gap-3">
    <UFormField label="From">
      <USelect
        v-model="from"
        :items="props.formats"
        class="w-40"
      />
    </UFormField>
    <UButton
      color="neutral"
      variant="ghost"
      icon="i-lucide-arrow-left-right"
      aria-label="Swap formats"
      @click="swap"
    />
    <UFormField label="To">
      <USelect
        v-model="to"
        :items="props.formats"
        class="w-40"
      />
    </UFormField>
  </div>
</template>
