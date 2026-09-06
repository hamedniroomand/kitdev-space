<script setup lang="ts">
import type { Tool } from '#shared/types/tools'
import type { BreadcrumbCrumb } from '#shared/utils/breadcrumbs'

/**
 * The heading of a tool page.
 *
 * The registry is the one source of the name and the description. `useToolSeo`
 * provides the tool, and the same text feeds the title tag, the meta
 * description, and the OpenGraph image. Give a prop only to override it.
 */
const props = defineProps<{
  title?: string
  description?: string
}>()

const breadcrumbs = inject<ComputedRef<BreadcrumbCrumb[]> | undefined>(
  'toolBreadcrumbs',
  undefined,
)

const tool = inject<ComputedRef<Tool> | undefined>('currentTool', undefined)

const heading = computed(() => props.title ?? tool?.value?.seoTitle ?? tool?.value?.name ?? '')
const summary = computed(() => props.description ?? tool?.value?.description ?? '')
</script>

<template>
  <header class="mb-8">
    <ToolBreadcrumbs
      v-if="breadcrumbs?.length"
      :items="breadcrumbs"
    />
    <h1
      v-if="heading"
      class="text-3xl font-medium tracking-tight text-highlighted"
    >
      {{ heading }}
    </h1>
    <p
      v-if="summary"
      class="mt-2 text-base leading-[1.6] text-muted"
    >
      {{ summary }}
    </p>
  </header>
</template>
