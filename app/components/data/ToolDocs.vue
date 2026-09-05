<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <section class="space-y-6">
    <h2
      v-if="title"
      class="text-xl font-semibold tracking-tight text-highlighted"
    >
      {{ title }}
    </h2>
    <slot />
  </section>
</template>
