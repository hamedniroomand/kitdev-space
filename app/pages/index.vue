<script setup lang="ts">
import type { ToolCategory } from '#shared/types/tools'

const { categoryLabels, getPrimaryTools, getToolsByCategory } = useTools()
const openSearch = inject<() => void>('openSearch', () => {})

const categories: ToolCategory[] = ['data', 'network', 'crypto', 'color', 'image', 'dev']

useSeoMeta({
  title: 'KitDev Space',
  description: 'Developer tools for people who build things.',
  ogTitle: 'KitDev Space',
  ogDescription: 'Developer tools for people who build things.',
  ogType: 'website'
})

useKitDevOgImage({
  title: 'Tools for people who build.',
  description: 'Fast, free developer tools. No account.',
  eyebrow: 'KitDev Space'
})
</script>

<template>
  <div class="relative isolate overflow-hidden">
    <div
      class="forge-ambient -z-10"
      aria-hidden="true"
    />

    <UContainer class="py-16 sm:py-20">
      <!-- Hero Section -->
      <div class="mx-auto max-w-3xl text-center">
        <p class="forge-enter font-mono text-xs font-semibold tracking-widest text-primary uppercase leading-[1.2]">
          KitDev Space
        </p>
        <h1 class="mt-4 text-4xl font-medium tracking-tight text-highlighted sm:text-5xl lg:text-[64px] lg:leading-[1.04]">
          Tools for people who build.
        </h1>
        <p
          class="forge-enter mt-4 text-base leading-[1.6] text-muted sm:text-lg"
          style="--forge-delay: 60ms"
        >
          Fast, free developer tools in a unified workspace.
        </p>

        <!-- Value Propositions -->
        <div
          class="forge-enter mt-6 flex flex-wrap items-center justify-center gap-2"
          style="--forge-delay: 120ms"
        >
          <UBadge
            color="neutral"
            variant="subtle"
            size="md"
            icon="i-lucide-shield-check"
            class="rounded-full border border-default bg-elevated/80 text-muted"
          >
            Zero Tracking
          </UBadge>
          <span class="text-muted hidden sm:inline">·</span>
          <UBadge
            color="neutral"
            variant="subtle"
            size="md"
            icon="i-lucide-user-x"
            class="rounded-full border border-default bg-elevated/80 text-muted"
          >
            No Accounts
          </UBadge>
          <span class="text-muted hidden sm:inline">·</span>
          <UBadge
            color="neutral"
            variant="subtle"
            size="md"
            icon="i-lucide-zap"
            class="rounded-full border border-default bg-elevated/80 text-muted"
          >
            Sub-10ms Native Speed
          </UBadge>
        </div>

        <!-- Primary Call to Action -->
        <div
          class="forge-enter mt-10 flex flex-wrap items-center justify-center gap-4"
          style="--forge-delay: 180ms"
        >
          <UButton
            to="/hub"
            size="xl"
            color="primary"
            icon="i-lucide-layout-grid"
            class="rounded-control font-medium px-6 shadow-xs"
          >
            Open All Tools in Hub
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            size="xl"
            class="rounded-control font-normal border-default bg-elevated hover:bg-accented text-highlighted"
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
            <p class="text-sm text-muted leading-[1.6]">
              Select any tool to open the workspace.
            </p>
          </div>
          <UButton
            to="/hub"
            color="neutral"
            variant="ghost"
            icon="i-lucide-arrow-right"
            trailing
            class="rounded-control"
          >
            Open Hub
          </UButton>
        </div>

        <div class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <section
            v-for="category in categories"
            :key="category"
            class="forge-reveal forge-lift flex flex-col justify-between rounded-card border border-default bg-elevated p-6 shadow-xs hover:border-primary/50 hover:shadow-sm"
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
                :to="`/hub/${category}`"
                class="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <span>Open category in Hub</span>
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
        {{ getPrimaryTools().length }} tools ready in KitDev Space.
      </p>
    </UContainer>
  </div>
</template>
