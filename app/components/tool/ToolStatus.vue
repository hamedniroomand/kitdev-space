<script setup lang="ts">
defineProps<{
  message?: string
  meta?: string
}>()
</script>

<template>
  <div
    v-if="message || meta"
    class="flex flex-wrap items-center justify-between gap-2 text-sm text-muted"
  >
    <p v-if="message">
      {{ message }}
    </p>
    <p v-if="meta">
      {{ meta }}
    </p>
  </div>
</template>
