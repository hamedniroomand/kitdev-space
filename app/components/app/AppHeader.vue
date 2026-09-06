<script setup lang="ts">
const openSearch = inject<() => void>('openSearch', () => {})
</script>

<template>
  <UHeader
    title="KitDev Space"
    class="border-b border-default"
  >
    <template #title>
      <AppLogo />
    </template>

    <template #right>
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
      <UColorModeButton />
    </template>
  </UHeader>
</template>
