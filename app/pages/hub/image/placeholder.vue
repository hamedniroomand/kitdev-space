<script setup lang="ts">
import {
  generatePlaceholderSvg,
  svgToDataUri
} from '#shared/utils/image/placeholder'

const width = ref(600)
const height = ref(400)
const bgType = ref<'solid' | 'gradient'>('solid')
const bgColor1 = ref('#3b82f6')
const bgColor2 = ref('#8b5cf6')
const customText = ref('')
const textColor = ref('#ffffff')

const { copy, label, color, icon } = useCopyFeedback()

const presets = [
  { label: '600 × 400', w: 600, h: 400 },
  { label: '1200 × 630 (OG)', w: 1200, h: 630 },
  { label: '1080 × 1080 (Square)', w: 1080, h: 1080 },
  { label: '1920 × 1080 (FHD)', w: 1920, h: 1080 },
  { label: '300 × 250 (Ad)', w: 300, h: 250 }
]

function applyPreset(w: number, h: number) {
  width.value = w
  height.value = h
}

const svgOutput = computed(() => {
  return generatePlaceholderSvg({
    width: width.value,
    height: height.value,
    bgType: bgType.value,
    bgColor1: bgColor1.value,
    bgColor2: bgColor2.value,
    text: customText.value ? customText.value : undefined,
    textColor: textColor.value
  })
})

const dataUri = computed(() => svgToDataUri(svgOutput.value))

function downloadSvg() {
  const blob = new Blob([svgOutput.value], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `placeholder-${width.value}x${height.value}.svg`
  a.click()
  URL.revokeObjectURL(url)
}

function downloadPng() {
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = width.value
    canvas.height = height.value
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(img, 0, 0)
      const pngUrl = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = pngUrl
      a.download = `placeholder-${width.value}x${height.value}.png`
      a.click()
    }
  }
  img.src = dataUri.value
}

useSeoMeta({
  title: 'Placeholder Image Generator — KitDev Space',
  description: 'Generate customizable SVG and PNG placeholder images with custom dimensions, colors, and labels.'
})
</script>

<template>
  <ToolPage
    title="Placeholder Image Generator"
    description="Create customizable solid or gradient placeholder images with custom text and sizes."
  >
    <div class="space-y-6">
      <!-- Presets Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-muted font-medium">Presets:</span>
          <UButton
            v-for="p in presets"
            :key="p.label"
            size="xs"
            variant="ghost"
            color="neutral"
            :label="p.label"
            @click="applyPreset(p.w, p.h)"
          />
        </div>

        <div class="flex items-center gap-2">
          <UButton
            size="xs"
            variant="subtle"
            color="primary"
            icon="i-lucide-download"
            label="Download SVG"
            @click="downloadSvg"
          />
          <UButton
            size="xs"
            variant="solid"
            color="primary"
            icon="i-lucide-image"
            label="Download PNG"
            @click="downloadPng"
          />
        </div>
      </div>

      <!-- Controls & Preview Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Controls Panel -->
        <div class="space-y-4 border border-default rounded-xl p-4 bg-elevated/20">
          <h3 class="text-sm font-semibold text-default">
            Configuration
          </h3>

          <!-- Dimensions -->
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-xs text-muted font-medium">Width (px)</label>
              <UInput
                v-model.number="width"
                type="number"
                min="10"
                max="4000"
                class="w-full"
              />
            </div>
            <div class="space-y-1">
              <label class="text-xs text-muted font-medium">Height (px)</label>
              <UInput
                v-model.number="height"
                type="number"
                min="10"
                max="4000"
                class="w-full"
              />
            </div>
          </div>

          <!-- Background Type -->
          <div class="space-y-1.5">
            <label class="text-xs text-muted font-medium">Background Style</label>
            <div class="flex items-center rounded-lg border border-default p-0.5 bg-default">
              <UButton
                size="xs"
                :variant="bgType === 'solid' ? 'solid' : 'ghost'"
                color="neutral"
                label="Solid"
                class="flex-1"
                @click="bgType = 'solid'"
              />
              <UButton
                size="xs"
                :variant="bgType === 'gradient' ? 'solid' : 'ghost'"
                color="neutral"
                label="Gradient"
                class="flex-1"
                @click="bgType = 'gradient'"
              />
            </div>
          </div>

          <!-- Color Pickers -->
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="text-xs text-muted font-medium">{{ bgType === 'gradient' ? 'Color 1' : 'Color' }}</label>
              <div class="flex items-center gap-2">
                <input
                  v-model="bgColor1"
                  type="color"
                  class="w-8 h-8 rounded border border-default cursor-pointer p-0 bg-transparent"
                >
                <UInput
                  v-model="bgColor1"
                  class="w-full font-mono text-xs"
                />
              </div>
            </div>

            <div
              v-if="bgType === 'gradient'"
              class="space-y-1"
            >
              <label class="text-xs text-muted font-medium">Color 2</label>
              <div class="flex items-center gap-2">
                <input
                  v-model="bgColor2"
                  type="color"
                  class="w-8 h-8 rounded border border-default cursor-pointer p-0 bg-transparent"
                >
                <UInput
                  v-model="bgColor2"
                  class="w-full font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <!-- Custom Text -->
          <div class="space-y-1">
            <label class="text-xs text-muted font-medium">Custom Label (optional)</label>
            <UInput
              v-model="customText"
              placeholder="e.g. Hero Image, Banner"
              class="w-full"
            />
          </div>

          <!-- Text Color -->
          <div class="space-y-1">
            <label class="text-xs text-muted font-medium">Label Color</label>
            <div class="flex items-center gap-2">
              <input
                v-model="textColor"
                type="color"
                class="w-8 h-8 rounded border border-default cursor-pointer p-0 bg-transparent"
              >
              <UInput
                v-model="textColor"
                class="w-full font-mono text-xs"
              />
            </div>
          </div>
        </div>

        <!-- Preview Area -->
        <div class="lg:col-span-2 space-y-4">
          <div class="p-6 border border-default rounded-xl bg-elevated/40 flex flex-col items-center justify-center min-h-80 overflow-hidden">
            <div class="max-w-full max-h-96 overflow-auto p-2 flex items-center justify-center">
              <img
                :src="dataUri"
                alt="Generated placeholder"
                class="max-w-full max-h-80 object-contain shadow-lg rounded"
              >
            </div>
          </div>

          <!-- Code Outputs -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-default">SVG Code</span>
              <UButton
                size="xs"
                variant="subtle"
                :label="label('svg')"
                :color="color('svg')"
                :icon="icon('svg')"
                @click="copy(svgOutput, 'svg')"
              />
            </div>
            <UTextarea
              :model-value="svgOutput"
              readonly
              :rows="3"
              class="font-mono text-xs w-full"
            />
          </div>
        </div>
      </div>
    </div>
  </ToolPage>
</template>
