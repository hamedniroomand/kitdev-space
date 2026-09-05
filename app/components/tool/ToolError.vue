<script setup lang="ts">
defineProps<{
  message: string
}>()
</script>

<template>
  <UAlert
    color="error"
    variant="subtle"
    icon="i-lucide-circle-alert"
    title="Error"
    :description="message"
  />
</template>
