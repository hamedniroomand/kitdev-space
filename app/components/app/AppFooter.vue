<template>
  <UFooter>
    <template #left>
      <p class="text-sm text-muted">
        Built with Nuxt + Bun
      </p>
    </template>

    <template #right>
      <UButton
        to="/about"
        color="neutral"
        variant="ghost"
        size="sm"
      >
        About
      </UButton>
    </template>
  </UFooter>
</template>
