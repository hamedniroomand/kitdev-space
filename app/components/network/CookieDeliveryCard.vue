<script setup lang="ts">
import type { CookieDelivery } from '#shared/utils/network/cookie'

defineProps<{
  /** The result of the check against the request URL. */
  delivery?: CookieDelivery | null
}>()
</script>

<template>
  <div
    v-if="delivery"
    class="space-y-3 rounded-md border border-default p-3"
  >
    <UBadge
      :color="delivery.sent ? 'success' : 'error'"
      variant="subtle"
      :icon="delivery.sent ? 'i-lucide-send' : 'i-lucide-shield-x'"
    >
      {{ delivery.sent ? 'The browser sends this cookie to the request URL' : 'The browser does not send this cookie to the request URL' }}
    </UBadge>

    <ul
      v-if="delivery.blocks.length || delivery.notes.length"
      class="space-y-2"
    >
      <li
        v-for="(block, index) in delivery.blocks"
        :key="`block-${index}`"
        class="flex items-start gap-2 text-sm"
      >
        <UIcon
          name="i-lucide-shield-x"
          class="mt-0.5 size-4 shrink-0 text-error"
        />
        <span class="text-muted">{{ block }}</span>
      </li>
      <li
        v-for="(note, index) in delivery.notes"
        :key="`note-${index}`"
        class="flex items-start gap-2 text-sm"
      >
        <UIcon
          name="i-lucide-info"
          class="mt-0.5 size-4 shrink-0 text-info"
        />
        <span class="text-muted">{{ note }}</span>
      </li>
    </ul>
  </div>
</template>
