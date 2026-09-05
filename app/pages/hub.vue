<script setup lang="ts">
import type { ToolCategory } from '~/types/tools'
import { categoryLabels, getToolsByCategory } from '~~/shared/utils/tools'

definePageMeta({
  layout: false
})

const route = useRoute()
const searchQuery = ref('')
const mobileOpen = ref(false)
const searchOpen = ref(false)
const { track } = useToolAnalytics()

function openSearch() {
  searchOpen.value = true
  track('tool_search', { tool: 'search' })
}

provide('openSearch', openSearch)

defineShortcuts({
  meta_k: {
    handler: () => {
      openSearch()
    }
  }
})

const categoryOrder: ToolCategory[] = ['data', 'network', 'crypto', 'color', 'image', 'dev']

const categorizedTools = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return categoryOrder.map((cat) => {
    const list = getToolsByCategory(cat).filter((tool) => {
      if (!query) {
        return true
      }
      return (
        tool.name.toLowerCase().includes(query)
        || tool.description.toLowerCase().includes(query)
        || tool.keywords.some(k => k.toLowerCase().includes(query))
      )
    })

    return {
      category: cat,
      label: categoryLabels[cat],
      tools: list,
      total: getToolsByCategory(cat).length
    }
  }).filter(group => group.tools.length > 0)
})

function closeMobile() {
  mobileOpen.value = false
}

const contentArea = ref<HTMLElement | null>(null)
const { y: contentScrollY } = useScroll(contentArea)

function scrollToTop() {
  contentScrollY.value = 0
  if (contentArea.value) {
    contentArea.value.scrollTop = 0
  }
}

watch(() => route.path, () => {
  scrollToTop()
})
</script>

<template>
  <div class="h-dvh flex flex-col overflow-hidden bg-default text-default">
    <!-- Top Bar -->
    <header class="shrink-0 z-30 flex h-14 items-center justify-between border-b border-default bg-default/90 px-4 backdrop-blur">
      <div class="flex items-center gap-3">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-menu"
          class="lg:hidden"
          aria-label="Open tool navigation"
          @click="mobileOpen = true"
        />
        <AppLogo />
        <UBadge
          color="primary"
          variant="subtle"
          size="xs"
          class="font-mono text-xs uppercase"
        >
          Hub
        </UBadge>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          to="/"
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-arrow-left"
        >
          <span class="hidden sm:inline">Landing Page</span>
        </UButton>
        <UTooltip
          text="Search tools"
          :kbds="['meta', 'K']"
        >
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-search"
            aria-label="Search tools"
            @click="openSearch"
          />
        </UTooltip>
        <UColorModeButton />
      </div>
    </header>

    <!-- App Body: Sidebar + Content -->
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <!-- Desktop Sidebar -->
      <aside class="hidden w-72 shrink-0 border-r border-default bg-elevated/20 lg:flex lg:flex-col h-full overflow-hidden">
        <div class="shrink-0 p-3 border-b border-default">
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="Search tools..."
            class="w-full"
          >
            <template #trailing>
              <UButton
                v-if="searchQuery"
                color="neutral"
                variant="link"
                size="xs"
                icon="i-lucide-x"
                aria-label="Clear search"
                @click="searchQuery = ''"
              />
              <span
                v-else
                class="flex items-center gap-0.5 text-muted"
              >
                <UKbd
                  value="meta"
                  size="sm"
                />
                <UKbd
                  value="K"
                  size="sm"
                />
              </span>
            </template>
          </UInput>
        </div>

        <nav class="flex-1 overflow-y-auto p-3 space-y-6">
          <div
            v-for="group in categorizedTools"
            :key="group.category"
            class="space-y-1.5"
          >
            <div class="flex items-center justify-between px-2 py-1 text-xs font-mono font-semibold tracking-wider text-muted uppercase">
              <span>{{ group.label }}</span>
              <UBadge
                color="neutral"
                variant="subtle"
                size="xs"
              >
                {{ group.tools.length }}
              </UBadge>
            </div>

            <ul class="space-y-0.5">
              <li
                v-for="tool in group.tools"
                :key="tool.id"
              >
                <NuxtLink
                  :to="tool.route"
                  class="group flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors"
                  :class="route.path === tool.route
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-default/80 hover:bg-elevated hover:text-highlighted'"
                  @click="scrollToTop"
                >
                  <div class="flex items-center gap-2 truncate">
                    <UIcon
                      :name="tool.icon"
                      class="size-4 shrink-0"
                      :class="route.path === tool.route ? 'text-primary' : 'text-muted group-hover:text-default'"
                    />
                    <span class="truncate">{{ tool.name }}</span>
                  </div>

                  <UBadge
                    v-if="tool.clientOnly"
                    color="neutral"
                    variant="subtle"
                    size="xs"
                    class="shrink-0 text-[10px]"
                  >
                    🔒 Client
                  </UBadge>
                  <UBadge
                    v-else-if="tool.serverRequired"
                    color="warning"
                    variant="subtle"
                    size="xs"
                    class="shrink-0 text-[10px]"
                  >
                    ⚡ Bun
                  </UBadge>
                </NuxtLink>
              </li>
            </ul>
          </div>

          <div
            v-if="categorizedTools.length === 0"
            class="py-8 text-center text-sm text-muted"
          >
            No tools found for "{{ searchQuery }}".
          </div>
        </nav>

        <div class="shrink-0 p-3 border-t border-default flex items-center justify-between text-xs text-muted">
          <NuxtLink
            to="/"
            class="flex items-center gap-1 hover:text-highlighted transition-colors"
          >
            <UIcon
              name="i-lucide-arrow-left"
              class="size-3.5"
            />
            <span>Landing Page</span>
          </NuxtLink>
          <NuxtLink
            to="/about"
            class="hover:text-highlighted transition-colors"
          >
            About
          </NuxtLink>
        </div>
      </aside>

      <!-- Mobile Drawer -->
      <USlideover
        v-model:open="mobileOpen"
        title="Tools Hub"
      >
        <template #body>
          <div class="space-y-4">
            <UInput
              v-model="searchQuery"
              icon="i-lucide-search"
              placeholder="Search tools..."
              class="w-full"
            />

            <div class="space-y-6">
              <div
                v-for="group in categorizedTools"
                :key="group.category"
                class="space-y-1.5"
              >
                <div class="flex items-center justify-between px-2 py-1 text-xs font-mono font-semibold tracking-wider text-muted uppercase">
                  <span>{{ group.label }}</span>
                  <UBadge
                    color="neutral"
                    variant="subtle"
                    size="xs"
                  >
                    {{ group.tools.length }}
                  </UBadge>
                </div>

                <ul class="space-y-0.5">
                  <li
                    v-for="tool in group.tools"
                    :key="tool.id"
                  >
                    <NuxtLink
                      :to="tool.route"
                      class="flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-sm"
                      :class="route.path === tool.route
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-default/80 hover:bg-elevated hover:text-highlighted'"
                      @click="() => { closeMobile(); scrollToTop(); }"
                    >
                      <div class="flex items-center gap-2 truncate">
                        <UIcon
                          :name="tool.icon"
                          class="size-4 shrink-0"
                        />
                        <span class="truncate">{{ tool.name }}</span>
                      </div>

                      <UBadge
                        v-if="tool.clientOnly"
                        color="neutral"
                        variant="subtle"
                        size="xs"
                      >
                        🔒 Client
                      </UBadge>
                      <UBadge
                        v-else-if="tool.serverRequired"
                        color="warning"
                        variant="subtle"
                        size="xs"
                      >
                        ⚡ Bun
                      </UBadge>
                    </NuxtLink>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </template>
      </USlideover>

      <!-- Main Hub Content Area -->
      <main
        ref="contentArea"
        class="flex-1 min-h-0 overflow-y-auto"
      >
        <NuxtPage />
      </main>
    </div>

    <!-- Command Palette for quick search -->
    <AppCommandPalette v-model:open="searchOpen" />
  </div>
</template>
