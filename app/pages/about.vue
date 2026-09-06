<script setup lang="ts">
useSeoMeta({
  title: 'About',
  description: 'Learn what KitDev Space is and how it works.',
  ogTitle: 'About KitDev Space',
  ogDescription: 'Learn what KitDev Space is and how it works.',
  ogType: 'website'
})

useKitDevOgImage({
  title: 'About KitDev Space',
  description: 'Learn what KitDev Space is and how it works.',
  eyebrow: 'About'
})
</script>

<template>
  <UContainer class="py-16 sm:py-20 max-w-2xl">
    <div class="rounded-[16px] border border-default bg-elevated p-6 sm:p-8 shadow-xs">
      <h1 class="text-3xl font-medium tracking-tight text-highlighted">
        About KitDev Space
      </h1>
      <div class="mt-6 space-y-4 text-base leading-[1.6] text-muted">
        <p>
          KitDev Space is a set of developer tools for people who build software.
        </p>
        <p>
          You can use the tools without an account.
        </p>
        <p>
          The browser processes data when it is safe. The server runs only when a tool needs it.
        </p>
        <p>
          We do not store your tool input.
        </p>
      </div>
    </div>
  </UContainer>
</template>
