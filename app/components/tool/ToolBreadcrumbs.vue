<script setup lang="ts">
import type { BreadcrumbCrumb } from '~~/shared/utils/breadcrumbs'

defineProps<{
  items: BreadcrumbCrumb[]
}>()
</script>

<template>
  <UBreadcrumb
    :items="items"
    class="mb-6 text-sm"
  />
</template>
