<script setup lang="ts">
import type { ToolCategory } from '~/types/tools'

const { tools, categoryLabels, getToolsByCategory } = useTools()
const openSearch = inject<() => void>('openSearch', () => {})

const categories: ToolCategory[] = ['data', 'network', 'crypto', 'color', 'image', 'dev']

useSeoMeta({
  title: 'KitDev Space',
  description: 'Developer tools for people who build things.',
  ogTitle: 'KitDev Space',
  ogDescription: 'Developer tools for people who build things.',
  twitterCard: 'summary_large_image'
})

useKitDevOgImage({
  title: 'Tools for people who build.',
  description: 'Fast, free developer utilities. No account.',
  eyebrow: 'KitDev Space'
})
</script>

<template>
  <div>
    <UContainer class="py-16 sm:py-24">
      <!-- Hero Section -->
      <div class="mx-auto max-w-3xl text-center">
        <p class="font-mono text-xs font-semibold tracking-widest text-primary uppercase">
          KitDev Space
        </p>
        <h1 class="mt-4 text-4xl font-medium tracking-tight text-highlighted sm:text-5xl lg:text-6xl lg:leading-[1.04]">
          Tools for people who build.
        </h1>
        <p class="mt-4 text-base leading-relaxed text-muted sm:text-lg">
          Fast, free developer tools in a unified workspace.
        </p>

        <!-- Value Propositions -->
        <div class="mt-6 flex flex-wrap items-center justify-center gap-2">
          <UBadge
            color="neutral"
            variant="subtle"
            size="md"
            icon="i-lucide-shield-check"
          >
            Zero Tracking
          </UBadge>
          <span class="text-muted hidden sm:inline">·</span>
          <UBadge
            color="neutral"
            variant="subtle"
            size="md"
            icon="i-lucide-user-x"
          >
            No Accounts
          </UBadge>
          <span class="text-muted hidden sm:inline">·</span>
          <UBadge
            color="neutral"
            variant="subtle"
            size="md"
            icon="i-lucide-zap"
          >
            Sub-10ms Native Speed
          </UBadge>
        </div>

        <!-- Primary Call to Action -->
        <div class="mt-10 flex flex-wrap items-center justify-center gap-4">
          <UButton
            to="/hub"
            size="xl"
            color="primary"
            icon="i-lucide-layout-grid"
            class="font-medium px-6 shadow-sm"
          >
            Open All Utilities in Hub
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            size="xl"
            class="font-normal"
            @click="openSearch"
          >
            <span class="text-muted">Search tools...</span>
            <span class="flex items-center gap-1 ml-2">
              <UKbd value="meta" />
              <UKbd value="K" />
            </span>
          </UButton>
        </div>
      </div>

      <!-- Category Highlights -->
      <div class="mt-20">
        <div class="flex items-center justify-between pb-4 border-b border-default">
          <div>
            <h2 class="text-xl font-medium text-highlighted">
              Tool Categories
            </h2>
            <p class="text-sm text-muted">
              Select any tool to open the workspace.
            </p>
          </div>
          <UButton
            to="/hub"
            color="neutral"
            variant="ghost"
            icon="i-lucide-arrow-right"
            trailing
          >
            Open Hub
          </UButton>
        </div>

        <div class="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <section
            v-for="category in categories"
            :key="category"
            class="flex flex-col justify-between rounded-md border border-default bg-elevated/40 p-6 transition-colors hover:border-primary/50"
          >
            <div>
              <div class="flex items-center justify-between gap-3">
                <h3 class="font-mono text-xs font-semibold tracking-widest text-muted uppercase">
                  {{ categoryLabels[category] }}
                </h3>
                <UBadge
                  color="neutral"
                  variant="subtle"
                  size="xs"
                >
                  {{ getToolsByCategory(category).length }} tools
                </UBadge>
              </div>

              <ul class="mt-4 space-y-2">
                <li
                  v-for="tool in getToolsByCategory(category).slice(0, 3)"
                  :key="tool.id"
                >
                  <NuxtLink
                    v-if="tool.status === 'available'"
                    :to="tool.route"
                    class="group flex items-center justify-between gap-3 py-1 text-sm text-highlighted hover:text-primary"
                  >
                    <span class="truncate">{{ tool.name }}</span>
                    <UIcon
                      name="i-lucide-arrow-right"
                      class="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </NuxtLink>
                  <div
                    v-else
                    class="flex items-center justify-between gap-3 py-1 text-sm text-muted"
                  >
                    <span>{{ tool.name }}</span>
                    <UBadge
                      color="neutral"
                      variant="subtle"
                      size="xs"
                    >
                      Soon
                    </UBadge>
                  </div>
                </li>
              </ul>
            </div>

            <div class="mt-6 pt-4 border-t border-default/60">
              <NuxtLink
                :to="getToolsByCategory(category)[0]?.route ?? '/hub'"
                class="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <span>Launch category in Hub</span>
                <UIcon
                  name="i-lucide-chevron-right"
                  class="size-3"
                />
              </NuxtLink>
            </div>
          </section>
        </div>
      </div>

      <p class="mt-16 text-center font-mono text-xs tracking-wide text-muted">
        {{ tools.length }} tools ready in KitDev Space.
      </p>
    </UContainer>
  </div>
</template>
