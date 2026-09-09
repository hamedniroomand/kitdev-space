<script setup lang="ts">
import { extractPaletteFromPixels } from '#shared/utils/color/palette-extractor'
import { rasterizeSvgInBrowser } from '~/utils/image/svg-browser'

useToolSeo('image-palette')

const SAMPLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="100" height="200" fill="#3b82f6"/><rect x="100" width="100" height="200" fill="#10b981"/><rect x="200" width="100" height="200" fill="#f43f5e"/></svg>'

const file = ref<File | null>(null)
const colorCount = ref(8)
const minDistance = ref(32)
const pixels = shallowRef<Uint8ClampedArray | null>(null)
const anchorHex = ref<string | null>(null)
const isProcessing = ref(false)
const error = ref<string | null>(null)

const { copy, label, icon, color } = useCopyFeedback()
const { setHandoffColor } = useColorHandoff()
const previewUrl = useObjectUrl(() => file.value ?? undefined)
const fileName = computed(() => file.value?.name ?? '')

// The decode scales the image to this square. A squashed aspect keeps the same
// color proportions, and the small size holds the work off the main thread.
const SAMPLE_SIZE = 120

async function readPixels(source: File) {
  // A browser cannot always decode an SVG blob, so rasterize an SVG first
  const blob = source.type === 'image/svg+xml'
    ? (await rasterizeSvgInBrowser(source)).blob
    : source

  const bitmap = await createImageBitmap(blob, {
    resizeWidth: SAMPLE_SIZE,
    resizeHeight: SAMPLE_SIZE,
    resizeQuality: 'pixelated',
  })

  // A browser can ignore the resize options, so cap the pixel read again here
  const w = Math.min(SAMPLE_SIZE, bitmap.width)
  const h = Math.min(SAMPLE_SIZE, bitmap.height)

  try {
    const canvas = new OffscreenCanvas(w, h)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas 2D context is not available.')
    }
    ctx.drawImage(bitmap, 0, 0, w, h)
    return ctx.getImageData(0, 0, w, h).data
  }
  finally {
    bitmap.close()
  }
}

async function loadPixels(source: File) {
  isProcessing.value = true
  try {
    const data = await readPixels(source)
    // The user can select another file while the decode runs
    if (file.value === source) {
      pixels.value = data
    }
  }
  catch {
    error.value = 'The browser cannot read this image.'
  }
  finally {
    isProcessing.value = false
  }
}

watch(file, (next) => {
  anchorHex.value = null
  pixels.value = null
  error.value = null
  if (next) {
    loadPixels(next)
  }
})

const palette = computed(() => (
  pixels.value ? extractPaletteFromPixels(pixels.value, colorCount.value, minDistance.value) : []
))

const anchor = computed(() => palette.value.find(c => c.hex === anchorHex.value) ?? palette.value[0] ?? null)

function handleLoadSample() {
  file.value = new File([SAMPLE_SVG], 'sample-spectrum.svg', { type: 'image/svg+xml' })
}

function handleCountChange(count: number) {
  colorCount.value = count
}

function handleClear() {
  file.value = null
}

/** The color moves in memory, so it never enters the URL. */
function handleSendTo(path: string) {
  if (!anchor.value)
    return
  setHandoffColor(anchor.value.hex)
  return navigateTo(path)
}

const cssVariablesOutput = computed(() => {
  if (palette.value.length === 0)
    return ''
  const lines = palette.value.map((c, i) => `  --palette-${i + 1}: ${c.hex};`)
  return `:root {\n${lines.join('\n')}\n}`
})

const jsonOutput = computed(() => {
  if (palette.value.length === 0)
    return ''
  return JSON.stringify(palette.value.map(c => c.hex), null, 2)
})
useLiveTool(palette)
</script>

<template>
  <ToolPage>
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

          <UFormField
            label="Min Distance"
            class="border-s border-default ps-3"
            :ui="{ label: 'text-xs text-muted font-medium' }"
          >
            <div class="flex w-40 items-center gap-2">
              <USlider
                :model-value="minDistance"
                :min="0"
                :max="100"
                :step="1"
                class="flex-1"
                @update:model-value="minDistance = Number($event)"
              />
              <span class="w-6 font-mono text-xs text-muted">{{ minDistance }}</span>
            </div>
          </UFormField>
        </div>

        <div class="flex items-center gap-2">
          <UButton
            label="Clear"
            icon="i-lucide-eraser"
            size="xs"
            color="neutral"
            variant="ghost"
            :disabled="!file"
            @click="handleClear"
          />
        </div>
      </div>

      <ImageDropzone
        v-if="!file"
        v-model="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/avif"
        hint="Max size 15 MB. PNG, JPEG, WebP, SVG, or AVIF."
      />

      <!-- Analysis View -->
      <div
        v-if="file"
        class="space-y-6"
      >
        <ToolError
          v-if="error"
          :message="error"
        />

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <!-- Image Card -->
          <div class="p-4 border border-default rounded-xl bg-elevated/40 space-y-3">
            <div class="text-xs font-semibold text-default truncate">
              {{ fileName || 'Selected image' }}
            </div>
            <div class="flex items-center justify-center bg-default p-2 rounded-lg border border-default max-h-64 overflow-hidden">
              <img
                :src="previewUrl"
                alt="Preview"
                class="max-h-60 object-contain rounded"
              >
            </div>
          </div>

          <!-- Extracted Palette Grid -->
          <div class="md:col-span-2 space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-semibold text-default">
                  Dominant Colors ({{ palette.length }})
                </h3>
                <UIcon
                  v-if="isProcessing"
                  name="i-lucide-loader-circle"
                  class="size-3.5 text-muted animate-spin"
                />
              </div>
              <div class="flex items-center gap-2">
                <UButton
                  size="xs"
                  variant="subtle"
                  :color="color('json')"
                  :icon="icon('json')"
                  :label="label('json', 'Copy JSON')"
                  @click="copy(jsonOutput, 'json')"
                />
                <UButton
                  size="xs"
                  variant="subtle"
                  :color="color('css')"
                  :icon="icon('css')"
                  :label="label('css', 'Copy CSS Vars')"
                  @click="copy(cssVariablesOutput, 'css', 'snippet')"
                />
              </div>
            </div>

            <!-- Base Anchor -->
            <div
              v-if="anchor"
              class="flex flex-wrap items-center gap-3 p-3 border border-default rounded-xl bg-elevated/40"
            >
              <div
                class="size-8 rounded-lg border border-default"
                :style="{ backgroundColor: anchor.hex }"
              />
              <div class="text-xs">
                <div class="font-mono font-semibold text-default">
                  {{ anchor.hex }}
                </div>
                <div class="text-muted">
                  Base anchor color
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2 ms-auto">
                <UButton
                  size="xs"
                  variant="subtle"
                  color="neutral"
                  icon="i-lucide-swatch-book"
                  label="Open in Shades"
                  :aria-label="`Open ${anchor.hex} in the Tailwind shades tool`"
                  @click="handleSendTo('/hub/color/tailwind-shades')"
                />
                <UButton
                  size="xs"
                  variant="subtle"
                  color="neutral"
                  icon="i-lucide-contrast"
                  label="Check Contrast"
                  :aria-label="`Check the contrast of ${anchor.hex}`"
                  @click="handleSendTo('/hub/color/contrast-checker')"
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
                <button
                  type="button"
                  class="h-16 w-full cursor-pointer transition-opacity hover:opacity-90"
                  :class="c.hex === anchor?.hex ? 'ring-2 ring-inset ring-primary' : ''"
                  :style="{ backgroundColor: c.hex }"
                  :aria-label="`Use ${c.hex} as the base anchor color`"
                  :aria-pressed="c.hex === anchor?.hex"
                  @click="anchorHex = c.hex"
                />
                <div class="p-2.5 space-y-1 text-xs">
                  <div class="flex items-center justify-between font-mono font-semibold text-default">
                    <span class="flex items-center gap-1">
                      <UIcon
                        v-if="c.hex === anchor?.hex"
                        name="i-lucide-anchor"
                        class="size-3 text-primary"
                      />
                      {{ c.hex }}
                    </span>
                    <span class="text-muted text-[11px] font-normal">{{ c.percentage }}%</span>
                  </div>
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-[11px] text-muted font-mono truncate">
                      rgb({{ c.rgb.r }}, {{ c.rgb.g }}, {{ c.rgb.b }})
                    </span>
                    <UButton
                      size="xs"
                      variant="ghost"
                      :color="color(c.hex)"
                      :icon="icon(c.hex)"
                      :aria-label="`${label(c.hex, 'Copy')} ${c.hex}`"
                      @click="copy(c.hex, c.hex, 'field')"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #docs>
      <ToolDocs title="About palette extraction">
        <div class="space-y-4 text-muted">
          <p>
            This tool reads an image and gives the colors that use the most area. Use it to build a theme from a photo, a logo, or a screenshot.
          </p>
          <p>
            The result is a set of hex values that you can copy into CSS or into a design file. A brand color taken from a logo is exact, which a color picked by eye is not.
          </p>
          <p>
            The image is read in your browser and is not uploaded.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Palette Generator', to: '/hub/color/palette-generator' },
            { label: 'Color Converter', to: '/hub/color/converter' },
            { label: 'Contrast Checker', to: '/hub/color/contrast-checker' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
