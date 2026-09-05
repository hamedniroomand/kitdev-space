<template>
  <UContainer class="py-10 sm:py-16">
    <slot name="header" />
    <div class="space-y-6">
      <slot />
    </div>
    <div
      v-if="$slots.docs"
      class="mt-16 border-t border-default pt-10"
    >
      <slot name="docs" />
    </div>
  </UContainer>
</template>
