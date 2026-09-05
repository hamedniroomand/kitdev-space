<script setup lang="ts">
import type { ToolCategory } from '~/types/tools'

const props = defineProps<{
  category: ToolCategory
}>()

const { categoryLabels, getToolsByCategory } = useTools()

const label = computed(() => categoryLabels[props.category])
const categoryTools = computed(() => getToolsByCategory(props.category))

useSeoMeta({
  title: () => label.value,
  description: () => `${label.value} tools in DevKit Space.`
})
</script>

<template>
  <UContainer class="py-16 sm:py-24">
    <h1 class="text-3xl font-semibold tracking-tight text-highlighted">
      {{ label }}
    </h1>
    <p class="mt-2 text-muted">
      Choose a tool to start.
    </p>

    <ul class="mt-10 divide-y divide-default border-y border-default">
      <li
        v-for="tool in categoryTools"
        :key="tool.id"
        class="py-4"
      >
        <NuxtLink
          v-if="tool.status === 'available'"
          :to="tool.route"
          class="group flex items-start justify-between gap-4"
        >
          <div>
            <p class="font-medium text-highlighted group-hover:text-primary">
              {{ tool.name }}
            </p>
            <p class="mt-1 text-sm text-muted">
              {{ tool.description }}
            </p>
          </div>
          <UIcon
            name="i-lucide-arrow-right"
            class="mt-1 size-4 shrink-0 text-muted group-hover:text-primary"
          />
        </NuxtLink>
        <div
          v-else
          class="flex items-start justify-between gap-4"
        >
          <div>
            <p class="font-medium text-muted">
              {{ tool.name }}
            </p>
            <p class="mt-1 text-sm text-muted">
              {{ tool.description }}
            </p>
          </div>
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
  </UContainer>
</template>
