<script setup lang="ts">
const searchOpen = ref(false)

function openSearch() {
  searchOpen.value = true
}

provide('openSearch', openSearch)

defineShortcuts({
  meta_k: {
    handler: () => {
      searchOpen.value = true
    }
  }
})
</script>

<template>
  <div class="min-h-dvh flex flex-col">
    <AppHeader />
    <UMain class="flex-1">
      <slot />
    </UMain>
    <AppFooter />
    <AppCommandPalette v-model:open="searchOpen" />
  </div>
</template>
