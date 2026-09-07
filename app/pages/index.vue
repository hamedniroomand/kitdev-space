<script setup lang="ts">
import type { ToolCategory } from '#shared/types/tools'

const { categoryLabels, getPrimaryTools, getToolsByCategory } = useTools()
const { track } = useToolAnalytics()
const openSearch = inject<() => void>('openSearch', () => {})

const categories: { id: ToolCategory, description: string }[] = [
  { id: 'data', description: 'Read a dataset, check its structure, or convert it for your next step.' },
  { id: 'dev', description: 'Test a pattern, format code, or convert a value while you work.' },
  { id: 'network', description: 'Check DNS records, response headers, and certificate details.' },
  { id: 'image', description: 'Prepare an image for the web or inspect the metadata in a photo.' },
  { id: 'color', description: 'Convert colors, build a shade scale, and check text contrast.' },
  { id: 'crypto', description: 'Check a hash, inspect a token, or generate an ID or secret.' },
]
const featuredIds = ['json-formatter', 'sqlite-studio', 'http-inspector', 'image-metadata']
const featuredTools = featuredIds.flatMap(id => getPrimaryTools().filter(tool => tool.id === id))
const description = 'Format JSON, inspect a SQLite database, check a URL, and prepare images. Free developer tools, with browser processing where possible.'

useSeoMeta({
  title: 'Developer tools',
  description,
  ogTitle: 'KitDev Space — Developer tools',
  ogDescription: description,
  ogType: 'website',
})

useKitDevOgImage({
  title: 'Small tasks. Useful tools.',
  description: 'Inspect, convert, and prepare data for your next step.',
  eyebrow: 'KitDev Space',
})
</script>

<template>
  <UContainer class="home-surface">
    <section class="grid gap-12 py-16 sm:py-24 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-20" aria-labelledby="home-title">
      <div>
        <p class="font-mono text-xs text-muted">
          {{ getPrimaryTools().length }} tools · Free and open source
        </p>
        <h1 id="home-title" class="mt-6 max-w-xl text-5xl font-medium tracking-[-0.045em] text-highlighted sm:text-6xl lg:text-7xl leading-[1.06]">
          Small tasks.<br>Useful tools.
        </h1>
        <p class="mt-6 max-w-lg text-lg leading-relaxed text-muted">
          Format a response. Inspect a database. Check a URL.
          Find the tool you need, work with your input, and take the result back to your project.
        </p>
        <div class="home-enter mt-8 flex flex-wrap gap-3">
          <UButton
            to="/hub"
            size="xl"
            trailing-icon="i-lucide-arrow-right"
            @click="track('cta_click', { cta: 'landing' })"
          >
            Browse tools
          </UButton>
          <UButton color="neutral" variant="outline" size="xl" icon="i-lucide-search" @click="openSearch">
            Find a tool
          </UButton>
        </div>
        <p class="mt-5 text-sm text-muted">
          Open a tool and start with a paste, a file, or a sample.
        </p>
      </div>

      <div class="home-enter rounded-xl border border-default bg-default/95" style="--home-delay: 80ms">
        <div class="flex items-center justify-between border-b border-default px-5 py-4 sm:px-6">
          <h2 class="text-sm font-medium text-highlighted">
            Start with a tool
          </h2>
          <span class="font-mono text-xs text-muted">01 — 04</span>
        </div>
        <ul class="divide-y divide-default">
          <li v-for="tool in featuredTools" :key="tool.id">
            <NuxtLink
              :to="tool.route"
              class="home-tool group flex items-start gap-4 px-5 py-5 sm:px-6"
              @click="track('tool_select', { tool: tool.id, source: 'home' })"
            >
              <UIcon :name="tool.icon" class="mt-0.5 size-5 shrink-0 text-muted" />
              <div class="min-w-0 flex-1">
                <h3 class="text-sm font-medium text-highlighted">
                  {{ tool.name }}
                </h3>
                <p class="mt-1.5 text-sm leading-relaxed text-muted">
                  {{ tool.description }}
                </p>
              </div>
              <UIcon name="i-lucide-arrow-up-right" class="home-arrow mt-0.5 size-4 shrink-0 text-muted" />
            </NuxtLink>
          </li>
        </ul>
      </div>
    </section>

    <section class="border-t border-default py-12 sm:py-16" aria-labelledby="directory-title">
      <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="font-mono text-xs text-muted">
            The directory
          </p>
          <h2 id="directory-title" class="mt-3 text-2xl font-medium tracking-tight text-highlighted sm:text-3xl">
            Find the right tool for the task.
          </h2>
        </div>
        <UButton to="/hub" color="neutral" variant="ghost" trailing-icon="i-lucide-arrow-right">
          View all {{ getPrimaryTools().length }} tools
        </UButton>
      </div>

      <div class="grid gap-x-12 lg:gap-x-20 md:grid-cols-2">
        <section v-for="(category, index) in categories" :key="category.id" class="border-t border-default py-7">
          <div class="flex items-baseline justify-between gap-4">
            <NuxtLink :to="`/hub/${category.id}`" class="home-category group inline-flex items-baseline gap-3">
              <span class="font-mono text-xs text-muted">0{{ index + 1 }}</span>
              <h3 class="text-lg font-medium text-highlighted">
                {{ categoryLabels[category.id] }}
              </h3>
              <UIcon name="i-lucide-arrow-up-right" class="home-arrow size-4 text-muted" />
            </NuxtLink>
            <span class="shrink-0 text-xs text-muted">{{ getToolsByCategory(category.id).length }} tools</span>
          </div>
          <p class="mt-3 max-w-md text-sm leading-relaxed text-muted">
            {{ category.description }}
          </p>
          <ul class="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            <li v-for="tool in getToolsByCategory(category.id).filter(item => item.status === 'available').slice(0, 3)" :key="tool.id">
              <NuxtLink
                :to="tool.route"
                class="home-inline text-sm text-toned underline decoration-default underline-offset-4"
                @click="track('tool_select', { tool: tool.id, source: 'home' })"
              >
                {{ tool.name }}
              </NuxtLink>
            </li>
          </ul>
        </section>
      </div>
    </section>

    <section class="mb-12 grid gap-6 rounded-xl border border-default bg-elevated/50 p-6 sm:mb-16 sm:p-8 md:grid-cols-[1fr_1.5fr] md:gap-16" aria-labelledby="processing-title">
      <div>
        <UIcon name="i-lucide-monitor" class="size-5 text-muted" />
        <h2 id="processing-title" class="mt-3 text-xl font-medium tracking-tight text-highlighted">
          Know where your input goes.
        </h2>
      </div>
      <div class="space-y-3 text-sm leading-relaxed text-muted">
        <p>
          Many tools process your input in the browser. Others need a server, such as DNS lookups
          and some image conversions. Each tool explains where its work runs.
        </p>
        <p>
          Use a sample to try a tool before you add your own input.
          Copy the result or download it where the tool supports file output.
        </p>
      </div>
    </section>
  </UContainer>
</template>

<style scoped>
.home-tool,
.home-inline,
.home-category {
  transition: background-color 160ms ease, color 160ms ease;
}

.home-tool:hover,
.home-tool:focus-visible {
  background: var(--ui-bg-accented);
}

.home-inline:hover {
  color: var(--ui-primary);
}

.home-tool:focus-visible,
.home-inline:focus-visible,
.home-category:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 4px;
  border-radius: 4px;
}

.home-arrow {
  transition: transform 180ms ease, color 180ms ease;
}

.group:hover .home-arrow,
.group:focus-visible .home-arrow {
  transform: translate(2px, -2px);
  color: var(--ui-primary);
}

@media (prefers-reduced-motion: no-preference) {
  .home-enter {
    animation: home-enter 360ms ease-out backwards;
    animation-delay: var(--home-delay, 0ms);
  }
}

@keyframes home-enter {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-tool,
  .home-inline,
  .home-category,
  .home-arrow {
    transition: none;
  }
  .group:hover .home-arrow,
  .group:focus-visible .home-arrow {
    transform: none;
  }
}
</style>
