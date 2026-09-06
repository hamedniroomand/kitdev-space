<script setup lang="ts">
type OgCardVariant = 'x' | 'linkedin' | 'discord' | 'search'

defineProps<{
  variant: OgCardVariant
  title: string
  description: string
  image: string
  url: string
  siteName: string
}>()

const labels: Record<OgCardVariant, string> = {
  x: 'X preview',
  linkedin: 'LinkedIn preview',
  discord: 'Discord preview',
  search: 'Search snippet',
}
</script>

<template>
  <article class="overflow-hidden rounded-md border border-default bg-elevated/40">
    <p class="border-b border-default px-3 py-2 font-mono text-xs tracking-wide text-muted uppercase">
      {{ labels[variant] }}
    </p>

    <div
      v-if="variant === 'search'"
      class="space-y-1 p-4"
    >
      <p class="truncate text-sm text-primary">
        {{ title || 'Untitled page' }}
      </p>
      <p class="truncate text-xs text-muted">
        {{ url || 'https://example.com' }}
      </p>
      <p class="line-clamp-2 text-sm text-muted">
        {{ description || 'No description found.' }}
      </p>
    </div>

    <div
      v-else
      class="flex flex-col"
    >
      <div
        v-if="image"
        class="aspect-[1.91/1] bg-default"
      >
        <img
          :src="image"
          alt=""
          class="size-full object-cover"
          loading="lazy"
          referrerpolicy="no-referrer"
        >
      </div>
      <div
        v-else
        class="flex aspect-[1.91/1] items-center justify-center bg-default text-xs text-muted"
      >
        No image
      </div>
      <div class="space-y-1 p-3">
        <p
          v-if="siteName || url"
          class="truncate text-xs text-muted"
        >
          {{ siteName || url }}
        </p>
        <p class="line-clamp-2 text-sm font-medium text-highlighted">
          {{ title || 'Untitled page' }}
        </p>
        <p class="line-clamp-2 text-xs text-muted">
          {{ description || 'No description found.' }}
        </p>
      </div>
    </div>
  </article>
</template>
