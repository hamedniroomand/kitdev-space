<template>
  <UContainer class="py-12 sm:py-20 max-w-5xl">
    <slot name="header" />
    <div class="space-y-6 rounded-[16px] border border-default bg-elevated p-6 shadow-xs">
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
