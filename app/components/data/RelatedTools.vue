<script setup lang="ts">
import type { Tool } from '#shared/types/tools'

const props = defineProps<{
  /** Hand-picked links. Leave empty to list other tools in the same category. */
  items?: { label: string, to: string }[]
}>()

const MAX_SUGGESTIONS = 4

const currentTool = inject<ComputedRef<Tool | undefined> | undefined>(
  'currentTool',
  undefined,
)

const { getToolsByCategory, tools: allTools } = useTools()
const { track } = useToolAnalytics()

/** A related link may point at a tool page. Then the click is a tool selection. */
function onSelect(to: string) {
  const target = allTools.find(tool => tool.route === to)
  if (target) {
    track('tool_select', { tool: target.id, source: 'related' })
  }
}

const links = computed(() => {
  if (props.items?.length) {
    return props.items
  }

  const tool = currentTool?.value
  if (!tool) {
    return []
  }

  return getToolsByCategory(tool.category)
    .filter(item => item.id !== tool.id && item.status === 'available')
    .slice(0, MAX_SUGGESTIONS)
    .map(item => ({ label: item.name, to: item.route }))
})
</script>

<template>
  <div v-if="links.length">
    <h3 class="text-sm font-medium text-highlighted">
      Related tools
    </h3>
    <ul class="mt-3 flex flex-wrap gap-3">
      <li
        v-for="item in links"
        :key="item.to"
      >
        <NuxtLink
          :to="item.to"
          class="text-sm text-primary hover:underline"
          @click="onSelect(item.to)"
        >
          {{ item.label }}
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
