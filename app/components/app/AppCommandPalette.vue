<script setup lang="ts">
import type { CommandPaletteGroup, CommandPaletteItem } from '@nuxt/ui'
import type { ToolCategory } from '#shared/types/tools'
import { queryLengthBucket } from '#shared/utils/analytics/buckets'
import { categoryLabels, tools } from '#shared/utils/tools'

const open = defineModel<boolean>('open', { default: false })
const searchTerm = ref('')
const { track } = useToolAnalytics()

const categories: ToolCategory[] = ['data', 'crypto', 'color', 'network', 'image', 'dev']

const groups = computed<CommandPaletteGroup[]>(() => {
  return categories.map((category) => {
    const items: CommandPaletteItem[] = tools
      .filter(tool => tool.category === category)
      .map(tool => ({
        id: tool.id,
        label: tool.name,
        suffix: tool.status === 'coming-soon' ? 'Soon' : tool.description,
        icon: tool.icon,
        to: tool.status === 'available' ? tool.route : undefined,
        disabled: tool.status === 'coming-soon',
        onSelect(event: Event) {
          if (tool.status === 'coming-soon') {
            event.preventDefault()
            return
          }

          // The length range of the query is sent. The query itself is not.
          track('search_result', { tool: tool.id, query_length: queryLengthBucket(searchTerm.value.trim().length) })
          track('tool_select', { tool: tool.id, source: 'palette' })
          open.value = false
        },
      }))

    return {
      id: category,
      label: categoryLabels[category],
      items,
    }
  })
})

function onSelect(item: CommandPaletteItem) {
  if (item.to) {
    open.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <LazyUCommandPalette
        v-model:search-term="searchTerm"
        close
        placeholder="Search tools..."
        :groups="groups"
        class="h-80"
        @update:model-value="onSelect"
        @update:open="open = $event"
      />
    </template>
  </UModal>
</template>
