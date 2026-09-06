<template>
  <UFooter class="border-t border-default">
    <template #left>
      <p class="font-mono text-xs tracking-wide text-muted">
        Built by
        <NuxtLink
          to="https://niroomand.dev/"
          target="_blank"
          rel="noopener noreferrer"
          class="text-highlighted transition-colors hover:text-primary"
        >
          Hamed Niroomand
        </NuxtLink>
        with Nuxt + Bun
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
