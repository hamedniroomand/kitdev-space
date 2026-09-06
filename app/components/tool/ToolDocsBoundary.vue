<script setup lang="ts">
/**
 * A hydration boundary for the prose under a tool. `ToolPage` renders it as
 * `<LazyToolDocsBoundary hydrate-on-visible>`, so the docs and the related
 * links hydrate only when the user scrolls to them. The single root element
 * gives the lazy hydration a node to observe.
 */
</script>

<template>
  <div>
    <slot />
  </div>
</template>
