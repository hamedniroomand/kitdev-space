<script setup lang="ts">
const model = defineModel<string>({ default: '' })

defineProps<{
  label: string
  readonly?: boolean
  placeholder?: string
}>()
</script>

<template>
  <UFormField :label="label">
    <UTextarea
      v-model="model"
      :readonly="readonly"
      :placeholder="placeholder"
      :rows="12"
      autoresize
      class="w-full font-mono text-sm"
      :ui="{ base: 'font-mono' }"
    />
  </UFormField>
</template>
