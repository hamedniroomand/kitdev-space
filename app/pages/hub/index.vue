<script setup lang="ts">
useSeoMeta({
  title: 'Tools Hub',
  description: 'Browse KitDev Space tools by category.',
  ogTitle: 'Tools Hub',
  ogDescription: 'Browse KitDev Space tools by category.',
  ogType: 'website',
})

useKitDevOgImage({
  title: 'Tools Hub',
  description: 'Browse developer tools by category.',
  eyebrow: 'KitDev Space',
})

useSchemaOrg([
  defineBreadcrumb({
    itemListElement: [
      { name: 'Home', item: '/' },
      { name: 'Hub', item: '/hub' },
    ],
  }),
])

const { categoryLabels, getToolsByCategory } = useTools()
const { pinnedTools, recentTools, togglePin, isPinned, clearRecents } = useToolPreferences()

const categories = [
  'data',
  'network',
  'crypto',
  'color',
  'image',
  'dev',
] as const
</script>

<template>
  <UContainer class="py-12 sm:py-16 max-w-5xl">
    <ToolBreadcrumbs
      :items="[
        { label: 'Home', to: '/' },
        { label: 'Hub' },
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

    <!-- Client-Only Pinned & Recent Tools -->
    <ClientOnly>
      <!-- Pinned Tools Section -->
      <div
        v-if="pinnedTools.length > 0"
        class="mt-10 space-y-3"
      >
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-pin"
            class="w-4 h-4 text-primary"
          />
          <h2 class="text-sm font-semibold text-default">
            Pinned Tools
          </h2>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div
            v-for="t in pinnedTools"
            :key="t.id"
            class="group relative rounded-xl border border-default bg-elevated/40 p-3.5 transition-all hover:border-primary/50 hover:bg-elevated flex items-center justify-between"
          >
            <NuxtLink
              :to="t.route"
              class="flex items-center gap-2.5 min-w-0 flex-1"
            >
              <UIcon
                :name="t.icon"
                class="w-4 h-4 shrink-0 text-primary"
              />
              <span class="text-sm font-medium truncate text-default">{{ t.name }}</span>
            </NuxtLink>
            <UButton
              size="xs"
              variant="ghost"
              color="primary"
              icon="i-lucide-pin-off"
              aria-label="Unpin tool"
              class="opacity-0 group-hover:opacity-100 transition-opacity"
              @click.stop="togglePin(t.id)"
            />
          </div>
        </div>
      </div>

      <!-- Recent Tools Section -->
      <div
        v-if="recentTools.length > 0"
        class="mt-10 space-y-3"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-clock"
              class="w-4 h-4 text-muted"
            />
            <h2 class="text-sm font-semibold text-default">
              Recently Used
            </h2>
          </div>
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            label="Clear"
            icon="i-lucide-trash-2"
            @click="clearRecents"
          />
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div
            v-for="t in recentTools"
            :key="t.id"
            class="group relative rounded-xl border border-default bg-elevated/40 p-3.5 transition-all hover:border-primary/50 hover:bg-elevated flex items-center justify-between"
          >
            <NuxtLink
              :to="t.route"
              class="flex items-center gap-2.5 min-w-0 flex-1"
            >
              <UIcon
                :name="t.icon"
                class="w-4 h-4 shrink-0 text-muted group-hover:text-primary"
              />
              <span class="text-sm font-medium truncate text-default">{{ t.name }}</span>
            </NuxtLink>
            <UButton
              size="xs"
              variant="ghost"
              :color="isPinned(t.id) ? 'primary' : 'neutral'"
              :icon="isPinned(t.id) ? 'i-lucide-pin-off' : 'i-lucide-pin'"
              :aria-label="isPinned(t.id) ? 'Unpin tool' : 'Pin tool'"
              class="opacity-0 group-hover:opacity-100 transition-opacity"
              @click.stop="togglePin(t.id)"
            />
          </div>
        </div>
      </div>
    </ClientOnly>

    <!-- Category Cards -->
    <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="category in categories"
        :key="category"
        :to="`/hub/${category}`"
        class="forge-reveal forge-lift rounded-card border border-default bg-elevated p-5 shadow-xs hover:border-primary/50 hover:shadow-sm"
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
