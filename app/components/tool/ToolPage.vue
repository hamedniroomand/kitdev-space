<script setup lang="ts">
/**
 * Standard frame for a tool page.
 *
 * Give `title` and `description`, or fill the `header` slot. The `header` slot
 * wins when a page supplies it.
 *
 * The page shows a "Related tools" list below the tool. Fill the `docs` slot to
 * add prose and a hand-picked list in its place.
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
        v-if="title"
        :title="title"
        :description="description"
      />
    </slot>

    <div class="space-y-6 rounded-[16px] border border-default bg-elevated p-6 shadow-xs">
      <slot />
    </div>

    <div class="mt-16 border-t border-default pt-10">
      <slot name="docs">
        <RelatedTools />
      </slot>
    </div>
  </UContainer>
</template>
