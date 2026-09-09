<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import type { ToolCategory } from '#shared/types/tools'
import { createReusableTemplate, useLocalStorage } from '@vueuse/core'
import { categoryLabels, getToolsByCategory } from '#shared/utils/tools'

definePageMeta({
  layout: false,
})

const route = useRoute()
const searchQuery = ref('')
const mobileOpen = ref(false)
const sidebarCollapsed = useLocalStorage('kitdev:sidebar-collapsed', false, { initOnMounted: true })
const [DefineNavigation, ReuseNavigation] = createReusableTemplate()
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
    },
  },
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
      items: list.map(tool => ({
        label: tool.name,
        icon: tool.icon,
        to: tool.route,
        exact: true,
        badge: tool.clientOnly
          ? { label: '🔒 Client', color: 'neutral', variant: 'subtle', size: 'xs' }
          : tool.serverRequired
            ? { label: '⚡ Bun', color: 'warning', variant: 'subtle', size: 'xs' }
            : undefined,
        onSelect: () => {
          closeMobile()
          selectTool(tool.id)
        },
      } satisfies NavigationMenuItem)),
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

const sidebarNav = ref<HTMLElement | null>(null)

/** Keeps the active tool in view. A tool low in the list is off screen on a fresh load. */
function revealActiveTool() {
  nextTick(() => {
    sidebarNav.value?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' })
  })
}

/** A click on a tool in the sidebar. The analytics event says the sidebar was the source. */
function selectTool(toolId: string) {
  track('tool_select', { tool: toolId, source: 'sidebar' })
  scrollToTop()
}

watch(() => route.path, () => {
  scrollToTop()
  revealActiveTool()
})

watch(sidebarCollapsed, (collapsed) => {
  if (!collapsed)
    revealActiveTool()
})

onMounted(revealActiveTool)
</script>

<template>
  <DefineNavigation>
    <div v-for="group in categorizedTools" :key="group.category" class="space-y-2">
      <UButton
        :to="`/hub/${group.category}`"
        color="neutral"
        variant="link"
        size="xs"
        class="w-full justify-between px-2 text-muted"
        @click="() => { closeMobile(); scrollToTop(); }"
      >
        {{ group.label }}
        <UBadge color="neutral" variant="subtle" size="xs" :label="group.tools.length" />
      </UButton>
      <UNavigationMenu
        :items="group.items"
        orientation="vertical"
        :aria-label="group.label"
        :ui="{ link: 'py-2', linkLeadingIcon: 'size-4', linkLabel: 'truncate', linkTrailingBadge: 'text-[10px]' }"
      />
    </div>
    <p v-if="categorizedTools.length === 0" class="py-8 text-center text-sm text-muted">
      No tools found for "{{ searchQuery }}".
    </p>
  </DefineNavigation>
  <div class="hub-shell h-dvh flex flex-col overflow-hidden bg-default text-default" :data-focus-mode="sidebarCollapsed">
    <!-- Top Bar -->
    <header class="shrink-0 z-30 flex h-14 items-center justify-between border-b border-default bg-default px-4">
      <div class="flex items-center gap-3">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-menu"
          class="lg:hidden"
          aria-label="Open tool navigation"
          @click="mobileOpen = true"
        />
        <NuxtLink
          to="/"
          class="inline-flex items-center hover:opacity-90 transition-opacity"
        >
          <AppLogo />
        </NuxtLink>
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
          aria-label="Home"
          @click="track('cta_click', { cta: 'landing' })"
        >
          <span class="hidden sm:inline">Home</span>
        </UButton>
        <UButton
          to="https://github.com/hamedniroomand/kitdev-space"
          target="_blank"
          rel="noopener noreferrer"
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-simple-icons-github"
          aria-label="KitDev Space source on GitHub"
          @click="track('cta_click', { cta: 'github' })"
        >
          <span class="hidden sm:inline">GitHub</span>
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
        <AppColorModeMenu />
      </div>
    </header>

    <!-- App Body: Sidebar + Content -->
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <!-- Desktop Sidebar -->
      <aside
        aria-label="Tool sidebar"
        class="hidden shrink-0 border-r border-default bg-default lg:flex lg:flex-col h-full overflow-hidden"
        :class="sidebarCollapsed ? 'w-14' : 'w-72'"
      >
        <div class="shrink-0 border-b border-default" :class="sidebarCollapsed ? 'p-2' : 'p-3'">
          <UTooltip text="Search tools" :disabled="!sidebarCollapsed" :kbds="['meta', 'K']">
            <UButton
              color="neutral"
              :variant="sidebarCollapsed ? 'ghost' : 'outline'"
              icon="i-lucide-search"
              aria-label="Search tools"
              class="w-full"
              :class="sidebarCollapsed ? 'justify-center' : 'font-normal'"
              @click="openSearch"
            >
              <template v-if="!sidebarCollapsed" #default>
                <span class="text-muted">Search tools...</span>
                <span class="flex items-center gap-0.5 ml-auto">
                  <UKbd value="meta" size="sm" />
                  <UKbd value="K" size="sm" />
                </span>
              </template>
            </UButton>
          </UTooltip>
        </div>
        <div
          v-show="!sidebarCollapsed"
          id="hub-navigation"
          ref="sidebarNav"
          class="flex-1 overflow-y-auto p-3 space-y-5"
        >
          <ReuseNavigation />
        </div>
        <div class="mt-auto shrink-0 border-t border-default p-2">
          <UTooltip :text="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'" :content="{ side: 'right' }">
            <UButton
              color="neutral"
              variant="ghost"
              :icon="sidebarCollapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'"
              :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
              :aria-expanded="!sidebarCollapsed"
              aria-controls="hub-navigation"
              class="w-full"
              :class="sidebarCollapsed ? 'justify-center' : ''"
              @click="sidebarCollapsed = !sidebarCollapsed"
            >
              <span v-if="!sidebarCollapsed">Collapse sidebar</span>
            </UButton>
          </UTooltip>
        </div>
      </aside>

      <!-- Mobile Drawer -->
      <USlideover
        v-model:open="mobileOpen"
        title="Tools Hub"
        side="left"
      >
        <template #body>
          <div class="space-y-4">
            <UInput
              v-model="searchQuery"
              icon="i-lucide-search"
              placeholder="Search tools..."
              class="w-full"
            />

            <div class="space-y-5">
              <ReuseNavigation />
            </div>
          </div>
        </template>
      </USlideover>

      <!-- Main Hub Content Area -->
      <main
        ref="contentArea"
        class="workspace-content flex-1 min-w-0 min-h-0 overflow-y-auto"
      >
        <NuxtPage />
      </main>
    </div>

    <!-- Command Palette for quick search -->
    <LazyAppCommandPalette v-if="searchOpen" v-model:open="searchOpen" />
  </div>
</template>

<style scoped>
@media (min-width: 1024px) {
  .hub-shell[data-focus-mode='true'] {
    --hub-content-width: 100%;
  }
}
</style>
