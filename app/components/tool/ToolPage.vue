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
  <UContainer class="py-12 sm:py-20 max-w-5xl">
    <slot name="header">
      <ToolHeader
        :title="title"
        :description="description"
      />
    </slot>

    <div class="space-y-6 rounded-card border border-default bg-elevated p-6 shadow-xs">
      <slot />
    </div>

    <div class="mt-16 border-t border-default pt-10">
      <LazyToolDocsBoundary hydrate-on-visible>
        <slot name="docs">
          <RelatedTools />
        </slot>
      </LazyToolDocsBoundary>
    </div>
  </UContainer>
</template>
