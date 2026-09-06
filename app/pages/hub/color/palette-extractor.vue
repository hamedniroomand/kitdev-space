<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  extractPaletteFromPixels,
  type ExtractedColor
} from '../../../../shared/utils/color/palette-extractor'
import { useCopyFeedback } from '../../../composables/useCopyFeedback'

const imageUrl = ref('')
const fileName = ref('')
const colorCount = ref(8)
const palette = ref<ExtractedColor[]>([])
const isProcessing = ref(false)

const { copy } = useCopyFeedback()

// Sample colorful SVG image
const sampleImage = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzNiODJmNiIvPjxyZWN0IHg9IjEwMCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiMxMGI5ODEiLz48cmVjdCB4PSIyMDAiIHdpZHRoPSIxMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjQzZjVlIi8+PC9zdmc+'

function processImage(src: string) {
  isProcessing.value = true
  const img = new Image()
  img.crossOrigin = 'Anonymous'

  img.onload = () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      isProcessing.value = false
      return
    }

    // Scale down for fast color extraction
    const maxDim = 120
    const scale = Math.min(maxDim / img.width, maxDim / img.height, 1)
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))

    canvas.width = w
    canvas.height = h
    ctx.drawImage(img, 0, 0, w, h)

    const imageData = ctx.getImageData(0, 0, w, h)
    palette.value = extractPaletteFromPixels(imageData.data, colorCount.value)
    isProcessing.value = false
  }

  img.onerror = () => {
    isProcessing.value = false
  }

  img.src = src
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  fileName.value = file.name
  const reader = new FileReader()
  reader.onload = () => {
    const result = reader.result as string
    imageUrl.value = result
    processImage(result)
  }
  reader.readAsDataURL(file)
}

function handleLoadSample() {
  fileName.value = 'sample-spectrum.svg'
  imageUrl.value = sampleImage
  processImage(sampleImage)
}

function handleCountChange(count: number) {
  colorCount.value = count
  if (imageUrl.value) {
    processImage(imageUrl.value)
  }
}

function handleClear() {
  imageUrl.value = ''
  fileName.value = ''
  palette.value = []
}

const cssVariablesOutput = computed(() => {
  if (palette.value.length === 0) return ''
  const lines = palette.value.map((c, i) => `  --palette-${i + 1}: ${c.hex};`)
  return `:root {\n${lines.join('\n')}\n}`
})

const jsonOutput = computed(() => {
  if (palette.value.length === 0) return ''
  return JSON.stringify(palette.value.map(c => c.hex), null, 2)
})

useSeoMeta({
  title: 'Image Palette Extractor — KitDev Space',
  description: 'Extract dominant color palettes and hex codes from uploaded images using HTML5 Canvas.'
})
</script>

<template>
  <ToolPage
    title="Image Palette Extractor"
    description="Extract dominant colors, color percentages, and hex values from any uploaded image."
  >
    <div class="space-y-6">
      <!-- Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <div class="flex flex-wrap items-center gap-3">
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-image"
            label="Load Sample Image"
            @click="handleLoadSample"
          />

          <!-- Number of Colors -->
          <div class="flex items-center gap-1 border-s border-default ps-3">
            <span class="text-xs text-muted font-medium">Palette Size:</span>
            <UButton
              v-for="count in [5, 8, 12]"
              :key="count"
              size="xs"
              :variant="colorCount === count ? 'solid' : 'ghost'"
              :color="colorCount === count ? 'primary' : 'neutral'"
              :label="`${count} Colors`"
              @click="handleCountChange(count)"
            />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <UButton
            label="Clear"
            icon="i-lucide-eraser"
            size="xs"
            color="neutral"
            variant="ghost"
            :disabled="!imageUrl"
            @click="handleClear"
          />
        </div>
      </div>

      <!-- Upload Zone -->
      <div
        v-if="!imageUrl"
        class="p-8 border-2 border-dashed border-default hover:border-primary/60 rounded-2xl text-center cursor-pointer bg-elevated/20 transition-colors relative"
      >
        <input
          type="file"
          accept="image/*"
          class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          @change="handleFileSelect"
        >
        <div class="flex flex-col items-center justify-center gap-2 pointer-events-none">
          <UIcon
            name="i-lucide-upload-cloud"
            class="w-8 h-8 text-primary"
          />
          <div class="text-sm font-semibold text-default">
            Select an image or drop file here
          </div>
          <div class="text-xs text-muted">
            PNG, JPEG, WebP, SVG, AVIF up to 15MB
          </div>
        </div>
      </div>

      <!-- Analysis View -->
      <div
        v-if="imageUrl"
        class="space-y-6"
      >
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <!-- Image Card -->
          <div class="p-4 border border-default rounded-xl bg-elevated/40 space-y-3">
            <div class="text-xs font-semibold text-default truncate">
              {{ fileName || 'Uploaded Image' }}
            </div>
            <div class="flex items-center justify-center bg-default p-2 rounded-lg border border-default max-h-64 overflow-hidden">
              <img
                :src="imageUrl"
                alt="Preview"
                class="max-h-60 object-contain rounded"
              >
            </div>
            <div class="pt-1">
              <label class="block text-center cursor-pointer">
                <span class="text-xs text-primary font-medium hover:underline">Choose a different image</span>
                <input
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleFileSelect"
                >
              </label>
            </div>
          </div>

          <!-- Extracted Palette Grid -->
          <div class="md:col-span-2 space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-default">
                Dominant Colors ({{ palette.length }})
              </h3>
              <div class="flex items-center gap-2">
                <UButton
                  size="xs"
                  variant="subtle"
                  color="neutral"
                  icon="i-lucide-copy"
                  label="Copy JSON"
                  @click="copy(jsonOutput)"
                />
                <UButton
                  size="xs"
                  variant="subtle"
                  color="neutral"
                  icon="i-lucide-copy"
                  label="Copy CSS Vars"
                  @click="copy(cssVariablesOutput)"
                />
              </div>
            </div>

            <!-- Palette Swatches Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div
                v-for="(c, idx) in palette"
                :key="idx"
                class="rounded-xl border border-default overflow-hidden bg-elevated/30 shadow-xs flex flex-col"
              >
                <div
                  class="h-16 w-full cursor-pointer transition-opacity hover:opacity-90 flex items-center justify-center group"
                  :style="{ backgroundColor: c.hex }"
                  @click="copy(c.hex)"
                >
                  <span
                    class="opacity-0 group-hover:opacity-100 font-mono text-xs font-bold px-2 py-1 rounded bg-black/50 text-white transition-opacity"
                  >
                    Copy
                  </span>
                </div>
                <div class="p-2.5 space-y-1 text-xs">
                  <div class="flex items-center justify-between font-mono font-semibold text-default">
                    <span>{{ c.hex }}</span>
                    <span class="text-muted text-[11px] font-normal">{{ c.percentage }}%</span>
                  </div>
                  <div class="text-[11px] text-muted font-mono truncate">
                    rgb({{ c.rgb.r }}, {{ c.rgb.g }}, {{ c.rgb.b }})
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ToolPage>
</template>
