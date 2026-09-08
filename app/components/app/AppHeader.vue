<script setup lang="ts">
const openSearch = inject<() => void>('openSearch', () => {})
</script>

<template>
  <header class="sticky top-0 z-50 h-(--ui-header-height) border-b border-default bg-default/75 backdrop-blur-sm">
    <UContainer class="flex h-full items-center justify-between gap-3">
      <NuxtLink to="/" aria-label="KitDev Space" class="flex shrink-0 items-end gap-1.5 text-xl font-bold text-highlighted">
        <AppLogo />
      </NuxtLink>
      <div class="flex items-center gap-1.5">
        <UTooltip
          text="Search tools"
          :kbds="['meta', 'K']"
        >
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-search"
            aria-label="Search tools"
            @click="openSearch"
          />
        </UTooltip>
        <AppColorModeMenu />
      </div>
    </UContainer>
  </header>
</template>
