<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  formatAsCssVars,
  formatAsTailwindV3,
  formatAsTailwindV4,
  generateTailwindPalette,
  type TailwindShade
} from '~~/shared/utils/color/tailwind'
import { useCopyFeedback } from '../../../composables/useCopyFeedback'
import { useToolShortcuts } from '../../../composables/useToolShortcuts'

const inputColor = ref('#3b82f6')
const colorName = ref('brand')
const format = ref<'v4' | 'v3' | 'css'>('v4')

const { copy, label, color, icon } = useCopyFeedback()

const presets = [
  { label: 'Blue', hex: '#3b82f6' },
  { label: 'Indigo', hex: '#6366f1' },
  { label: 'Emerald', hex: '#10b981' },
  { label: 'Rose', hex: '#f43f5e' },
  { label: 'Amber', hex: '#f59e0b' },
  { label: 'Violet', hex: '#8b5cf6' }
]

const palette = computed<TailwindShade[]>(() => {
  try {
    return generateTailwindPalette(inputColor.value)
  } catch {
    return []
  }
})

const codeOutput = computed(() => {
  if (palette.value.length === 0) return ''
  const name = colorName.value.trim() || 'brand'
  if (format.value === 'v4') {
    return formatAsTailwindV4(palette.value, name)
  }
  if (format.value === 'v3') {
    return formatAsTailwindV3(palette.value, name)
  }
  return formatAsCssVars(palette.value, name)
})

function handlePreset(hex: string) {
  inputColor.value = hex
}

function handleCopyCode() {
  if (codeOutput.value) {
    copy(codeOutput.value)
  }
}

useToolShortcuts({
  onCopy: handleCopyCode
})

useSeoMeta({
  title: 'Tailwind Shade Generator — KitDev Space',
  description: 'Generate complete 50 to 950 color shade scales in Tailwind CSS v4, v3, and CSS custom property formats.'
})
</script>

<template>
  <ToolPage
    title="Tailwind Shade Generator"
    description="Generate complete 50 to 950 color shade scales for Tailwind CSS v4 and v3."
  >
    <div class="space-y-6">
      <!-- Toolbar & Presets -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-muted font-medium">Presets:</span>
          <UButton
            v-for="p in presets"
            :key="p.hex"
            size="xs"
            variant="ghost"
            color="neutral"
            :label="p.label"
            @click="handlePreset(p.hex)"
          />
        </div>

        <div class="flex items-center gap-2">
          <UButton
            :label="label()"
            :color="color()"
            :icon="icon()"
            size="xs"
            variant="subtle"
            :disabled="!codeOutput"
            @click="handleCopyCode"
          />
        </div>
      </div>

      <!-- Inputs Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Color Input -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-default">
            Base Color
          </label>
          <div class="flex items-center gap-3">
            <input
              v-model="inputColor"
              type="color"
              class="w-10 h-10 rounded-lg border border-default cursor-pointer p-0 bg-transparent shrink-0"
            >
            <UInput
              v-model="inputColor"
              placeholder="#3b82f6"
              class="font-mono text-sm w-full"
            />
          </div>
        </div>

        <!-- Color Name Input -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-default">
            Token Name
          </label>
          <UInput
            v-model="colorName"
            placeholder="e.g. brand, primary, accent"
            class="font-mono text-sm w-full"
          />
        </div>
      </div>

      <!-- Color Swatches Grid -->
      <div
        v-if="palette.length > 0"
        class="space-y-2"
      >
        <label class="block text-sm font-medium text-default">
          Generated 50–950 Shade Scale (Click any swatch to copy hex)
        </label>
        <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-2">
          <button
            v-for="s in palette"
            :key="s.shade"
            type="button"
            class="group rounded-xl p-3 text-center transition-transform hover:scale-105 shadow-xs border border-default/20 flex flex-col items-center justify-between min-h-24 cursor-pointer"
            :style="{ backgroundColor: s.hex }"
            @click="copy(s.hex)"
          >
            <span
              class="font-bold text-xs font-mono"
              :class="s.isDark ? 'text-white' : 'text-zinc-900'"
            >
              {{ s.shade }}
            </span>
            <span
              class="text-[11px] font-mono tracking-tight opacity-90 group-hover:opacity-100"
              :class="s.isDark ? 'text-white/90' : 'text-zinc-900/90'"
            >
              {{ s.hex }}
            </span>
          </button>
        </div>
      </div>

      <!-- Code Export -->
      <div class="space-y-3 pt-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1 rounded-lg border border-default p-0.5 bg-default">
            <UButton
              size="xs"
              :variant="format === 'v4' ? 'solid' : 'ghost'"
              color="neutral"
              label="Tailwind v4 (@theme)"
              @click="format = 'v4'"
            />
            <UButton
              size="xs"
              :variant="format === 'v3' ? 'solid' : 'ghost'"
              color="neutral"
              label="Tailwind v3 (config)"
              @click="format = 'v3'"
            />
            <UButton
              size="xs"
              :variant="format === 'css' ? 'solid' : 'ghost'"
              color="neutral"
              label="CSS Variables"
              @click="format = 'css'"
            />
          </div>

          <UButton
            :label="label()"
            :color="color()"
            :icon="icon()"
            size="xs"
            variant="subtle"
            @click="handleCopyCode"
          />
        </div>

        <ToolEditor
          :model-value="codeOutput"
          label="Configuration Code"
          lang="css"
          :rows="12"
          readonly
        />
      </div>
    </div>
  </ToolPage>
</template>
