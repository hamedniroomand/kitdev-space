<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <header class="mb-8">
    <h1 class="text-3xl font-medium tracking-tight text-highlighted">
      {{ title }}
    </h1>
    <p class="mt-2 text-base leading-relaxed text-muted">
      {{ description }}
    </p>
  </header>
</template>
