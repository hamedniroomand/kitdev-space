<script setup lang="ts">
/**
 * Standard frame for a tool page.
 *
 * The heading comes from the tool registry. Give `title` or `description` only
 * to override the registry text, or fill the `header` slot for a custom heading.
 *
 * The page shows a "Related tools" list below the tool. Fill the `docs` slot to
 * add prose and a hand-picked list in its place. The docs hydrate when they
 * scroll into view, so the tool above them gets the main thread first.
 */
defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <UContainer class="py-8 sm:py-12 max-w-5xl">
    <slot name="header">
      <ToolHeader
        :title="title"
        :description="description"
      />
    </slot>

    <UCard class="work-surface rounded-xl" :ui="{ body: 'space-y-6 p-4 sm:p-6' }">
      <slot />
    </UCard>

    <div class="mt-12 border-t border-default pt-8">
      <LazyToolDocsBoundary hydrate-on-visible>
        <slot name="docs">
          <RelatedTools />
        </slot>
      </LazyToolDocsBoundary>
    </div>
  </UContainer>
</template>
