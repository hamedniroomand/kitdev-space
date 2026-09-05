<template>
  <UContainer class="py-10 sm:py-16">
    <slot name="header" />
    <div class="space-y-6 rounded-md border border-default bg-elevated/40 p-4 sm:p-6">
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
