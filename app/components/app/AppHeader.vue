<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const openSearch = inject<() => void>('openSearch', () => {})

const items = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Tools',
    to: '/'
  },
  {
    label: 'About',
    to: '/about'
  }
])
</script>

<template>
  <UHeader
    title="DevKit Space"
    class="border-b border-default"
  >
    <template #title>
      <AppLogo />
    </template>

    <UNavigationMenu
      :items="items"
      class="hidden lg:flex"
    />

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

    <template #body>
      <UNavigationMenu
        :items="items"
        orientation="vertical"
        class="-mx-2.5"
      />
    </template>
  </UHeader>
</template>
