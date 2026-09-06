<script setup lang="ts">
const { track } = useToolAnalytics()
</script>

<template>
  <UFooter class="border-t border-default">
    <template #left>
      <p class="flex flex-wrap items-center gap-1 font-mono text-xs tracking-wide text-muted">
        <span>Built by Hamed Niroomand with</span>
        <a
          href="https://nuxt.com"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 hover:text-highlighted transition-colors"
        >
          <UIcon
            name="i-simple-icons-nuxt"
            class="size-3.5"
          />
          <span>Nuxt</span>
        </a>
        <span>+</span>
        <a
          href="https://bun.sh"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 hover:text-highlighted transition-colors"
        >
          <UIcon
            name="i-simple-icons-bun"
            class="size-3.5"
          />
          <span>Bun</span>
        </a>
        <span>· Open source under the MIT license.</span>
      </p>
    </template>
    <template #right>
      <UButton
        to="https://github.com/hamedniroomand/kitdev-space"
        target="_blank"
        rel="noopener noreferrer"
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-simple-icons-github"
        label="GitHub"
        aria-label="KitDev Space source on GitHub"
        @click="track('cta_click', { cta: 'github' })"
      />
    </template>
  </UFooter>
</template>
