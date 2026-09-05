<script setup lang="ts">
const searchOpen = ref(false)
const { track } = useToolAnalytics()

function openSearch() {
  searchOpen.value = true
  track('tool_search', { tool: 'search' })
}

provide('openSearch', openSearch)

defineShortcuts({
  meta_k: {
    handler: () => {
      openSearch()
    }
  }
})
</script>

<template>
  <div class="min-h-dvh flex flex-col bg-default text-default">
    <AppHeader />
    <UMain class="flex-1">
      <slot />
    </UMain>
    <AppFooter />
    <AppCommandPalette v-model:open="searchOpen" />
  </div>
</template>
