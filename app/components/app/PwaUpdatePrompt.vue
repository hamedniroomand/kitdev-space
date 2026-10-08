<script setup lang="ts">
const { $pwa } = useNuxtApp()

const visible = computed(() => Boolean($pwa?.needRefresh))

async function reload() {
  await $pwa?.updateServiceWorker(true)
}

function dismiss() {
  $pwa?.cancelPrompt?.()
}
</script>

<template>
  <ClientOnly>
    <div
      v-if="visible"
      class="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 pointer-events-none"
    >
      <UAlert
        color="primary"
        variant="solid"
        icon="i-lucide-refresh-cw"
        title="Update available"
        description="A new version of KitDev Space is ready. Reload to use it."
        class="pointer-events-auto max-w-lg shadow-lg"
        :actions="[
          { label: 'Reload', color: 'neutral', variant: 'solid', onClick: reload },
          { label: 'Later', color: 'neutral', variant: 'ghost', onClick: dismiss },
        ]"
      />
    </div>
  </ClientOnly>
</template>
