<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

/**
 * A menu with the three color modes: system, light, and dark. The button icon
 * shows the current preference. Nuxt UI's `UColorModeButton` toggles light
 * and dark only, so a user could not return to the system setting.
 */
const colorMode = useColorMode()

const MODES = [
  { value: 'system', label: 'System', icon: 'i-lucide-monitor' },
  { value: 'light', label: 'Light', icon: 'i-lucide-sun' },
  { value: 'dark', label: 'Dark', icon: 'i-lucide-moon' },
] as const

const current = computed(() => MODES.find(mode => mode.value === colorMode.preference) ?? MODES[0])

const items = computed<DropdownMenuItem[]>(() => MODES.map(mode => ({
  label: mode.label,
  icon: mode.icon,
  type: 'checkbox',
  checked: colorMode.preference === mode.value,
  onSelect() {
    colorMode.preference = mode.value
  },
})))
</script>

<template>
  <ClientOnly>
    <UDropdownMenu
      :items="items"
      :content="{ align: 'end' }"
    >
      <UButton
        color="neutral"
        variant="ghost"
        :icon="current.icon"
        :aria-label="`Color mode: ${current.label}. Open the menu to change it.`"
      />
    </UDropdownMenu>
    <template #fallback>
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-monitor"
        aria-label="Color mode"
        disabled
      />
    </template>
  </ClientOnly>
</template>
