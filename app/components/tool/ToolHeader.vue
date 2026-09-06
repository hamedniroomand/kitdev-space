<script setup lang="ts">
import type { BreadcrumbCrumb } from '#shared/utils/breadcrumbs'

defineProps<{
  title: string
  description?: string
}>()

const breadcrumbs = inject<ComputedRef<BreadcrumbCrumb[]> | undefined>(
  'toolBreadcrumbs',
  undefined
)
</script>

<template>
  <header class="mb-8">
    <ToolBreadcrumbs
      v-if="breadcrumbs?.length"
      :items="breadcrumbs"
    />
    <h1 class="text-3xl font-medium tracking-tight text-highlighted">
      {{ title }}
    </h1>
    <p
      v-if="description"
      class="mt-2 text-base leading-[1.6] text-muted"
    >
      {{ description }}
    </p>
  </header>
</template>
