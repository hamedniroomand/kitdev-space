<script setup lang="ts">
import type { ToolCategory } from '~/types/tools'

const { tools, categoryLabels, getToolsByCategory } = useTools()
const openSearch = inject<() => void>('openSearch', () => {})

const categories: ToolCategory[] = ['data', 'network', 'crypto', 'color']

useSeoMeta({
  title: 'DevKit Space',
  description: 'Developer tools for people who build things.',
  ogTitle: 'DevKit Space',
  ogDescription: 'Developer tools for people who build things.'
})
</script>

<template>
  <div>
    <UContainer class="py-16 sm:py-24">
      <div class="mx-auto max-w-2xl text-center">
        <p class="font-mono text-xs font-semibold tracking-widest text-primary uppercase">
          DevKit Space
        </p>
        <h1 class="mt-4 text-4xl font-medium tracking-tight text-highlighted sm:text-5xl lg:text-6xl lg:leading-[1.04]">
          Tools for people who build.
        </h1>
        <p class="mt-4 text-base leading-relaxed text-muted sm:text-lg">
          Fast, free developer utilities. No account.
        </p>

        <div class="mt-8">
          <UButton
            color="neutral"
            variant="outline"
            size="xl"
            block
            class="max-w-md mx-auto justify-between font-normal"
            @click="openSearch"
          >
            <span class="text-muted">Search tools...</span>
            <span class="flex items-center gap-1">
              <UKbd value="meta" />
              <UKbd value="K" />
            </span>
          </UButton>
        </div>
      </div>

      <div class="mt-20 grid gap-10 sm:grid-cols-2">
        <section
          v-for="category in categories"
          :key="category"
          class="rounded-md border border-default bg-elevated/60 p-6"
        >
          <div class="flex items-baseline justify-between gap-3">
            <h2 class="font-mono text-xs font-semibold tracking-widest text-muted uppercase">
              {{ categoryLabels[category].replace(' Lab', '') }}
            </h2>
            <NuxtLink
              :to="`/${category}`"
              class="text-sm text-primary hover:underline"
            >
              View all
            </NuxtLink>
          </div>
          <ul class="mt-4 space-y-2">
            <li
              v-for="tool in getToolsByCategory(category).slice(0, 3)"
              :key="tool.id"
            >
              <NuxtLink
                v-if="tool.status === 'available'"
                :to="tool.route"
                class="group flex items-center justify-between gap-3 py-1 text-highlighted hover:text-primary"
              >
                <span>{{ tool.name }}</span>
                <UIcon
                  name="i-lucide-arrow-right"
                  class="size-4 opacity-0 transition-opacity group-hover:opacity-100"
                />
              </NuxtLink>
              <div
                v-else
                class="flex items-center justify-between gap-3 py-1 text-muted"
              >
                <span>{{ tool.name }}</span>
                <UBadge
                  color="neutral"
                  variant="subtle"
                  size="sm"
                >
                  Soon
                </UBadge>
              </div>
            </li>
          </ul>
        </section>
      </div>

      <p class="mt-16 text-center font-mono text-xs tracking-wide text-muted">
        {{ tools.length }} tools in the catalog. More arrive each week.
      </p>
    </UContainer>
  </div>
</template>
