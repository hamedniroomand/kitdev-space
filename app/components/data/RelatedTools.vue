<script setup lang="ts">
defineProps<{
  items: { label: string, to: string }[]
}>()
</script>

<template>
  <div>
    <h3 class="text-sm font-medium text-highlighted">
      Related tools
    </h3>
    <ul class="mt-3 flex flex-wrap gap-3">
      <li
        v-for="item in items"
        :key="item.to"
      >
        <NuxtLink
          :to="item.to"
          class="text-sm text-primary hover:underline"
        >
          {{ item.label }}
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
