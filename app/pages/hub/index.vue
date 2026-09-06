<script setup lang="ts">
useSeoMeta({
  title: 'Tools Hub',
  description: 'Browse KitDev Space tools by category.',
  ogTitle: 'Tools Hub',
  ogDescription: 'Browse KitDev Space tools by category.',
  ogType: 'website'
})

useKitDevOgImage({
  title: 'Tools Hub',
  description: 'Browse developer tools by category.',
  eyebrow: 'KitDev Space'
})

useSchemaOrg([
  defineBreadcrumb({
    itemListElement: [
      { name: 'Home', item: '/' },
      { name: 'Hub', item: '/hub' }
    ]
  })
])

const { categoryLabels, getToolsByCategory } = useTools()

const categories = [
  'data',
  'network',
  'crypto',
  'color',
  'image',
  'dev'
] as const
</script>

<template>
  <UContainer class="py-12 sm:py-16 max-w-5xl">
    <ToolBreadcrumbs
      :items="[
        { label: 'Home', to: '/' },
        { label: 'Hub' }
      ]"
    />

    <p class="font-mono text-xs font-semibold tracking-widest text-primary uppercase leading-[1.2]">
      Hub
    </p>
    <h1 class="mt-3 text-3xl sm:text-4xl font-medium tracking-tight text-highlighted">
      Tools Hub
    </h1>
    <p class="mt-2 text-base leading-[1.6] text-muted">
      Choose a category to open tools in the workspace.
    </p>

    <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="category in categories"
        :key="category"
        :to="`/hub/${category}`"
        class="rounded-[16px] border border-default bg-elevated p-5 shadow-xs transition-all hover:border-primary/50 hover:shadow-sm"
      >
        <p class="font-mono text-xs font-semibold tracking-widest text-muted uppercase">
          {{ categoryLabels[category] }}
        </p>
        <p class="mt-2 text-sm text-highlighted">
          {{ getToolsByCategory(category).length }} tools
        </p>
        <p class="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
          Open category
          <UIcon
            name="i-lucide-chevron-right"
            class="size-3"
          />
        </p>
      </NuxtLink>
    </div>
  </UContainer>
</template>
