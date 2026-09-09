<script setup lang="ts">
import type { SvgExportFormat, SvgScale } from '~/utils/image/svg-browser'
import type { ZipEntries } from '~/utils/image/zip'
import { formatBytes } from '#shared/utils/format'
import { imageExtensionFor } from '#shared/utils/image/format'
import { rasterizeSvgInBrowser } from '~/utils/image/svg-browser'
import { blobToBytes, zipInBrowser } from '~/utils/image/zip'

const svgText = ref(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80">
  <rect width="120" height="80" fill="#0f766e"/>
  <text x="60" y="46" text-anchor="middle" fill="#ecfdf5" font-size="18" font-family="sans-serif">SVG</text>
</svg>`)
const file = ref<File | null>(null)
const format = ref<SvgExportFormat>('png')
const quality = ref(80)
const width = ref<number | null>(null)
const height = ref<number | null>(null)
const lockAspect = ref(true)
const background = ref('#ffffff')
// UCheckboxGroup carries string values only, so the scale numbers cross as strings.
const checkedScales = ref(['1', '2', '3'])
const selectedScales = computed(() => checkedScales.value.map(Number).sort() as SvgScale[])
const result1x = ref<Blob | null>(null)
const result2x = ref<Blob | null>(null)
const result3x = ref<Blob | null>(null)
const meta1x = ref<{ width: number | null, height: number | null } | null>(null)
const meta2x = ref<{ width: number | null, height: number | null } | null>(null)
const meta3x = ref<{ width: number | null, height: number | null } | null>(null)
const preview1x = useObjectUrl(result1x)
const preview2x = useObjectUrl(result2x)
const preview3x = useObjectUrl(result3x)
const { status, error, run, reset } = useTool()
const { downloadBlob } = useDownload()

const formatItems = [
  { label: 'PNG', value: 'png' },
  { label: 'WebP', value: 'webp' },
  { label: 'JPEG', value: 'jpeg' },
]

const scaleItems = [
  { label: '1x', value: '1' },
  { label: '2x', value: '2' },
  { label: '3x', value: '3' },
]

const scaleCards = computed(() => [
  { scale: 1 as SvgScale, blob: result1x.value, preview: preview1x.value, meta: meta1x.value },
  { scale: 2 as SvgScale, blob: result2x.value, preview: preview2x.value, meta: meta2x.value },
  { scale: 3 as SvgScale, blob: result3x.value, preview: preview3x.value, meta: meta3x.value },
].filter(card => card.blob))

useToolSeo('svg-converter')

async function convertScale(scale: SvgScale) {
  const source = svgText.value.trim() ? svgText.value.trim() : file.value
  if (!source) {
    throw new Error('Paste SVG code or upload an SVG file.')
  }

  const processed = await rasterizeSvgInBrowser(source, {
    scale,
    format: format.value,
    quality: quality.value,
    width: width.value,
    height: height.value,
    background: format.value === 'jpeg' ? background.value : null,
    stretch: !lockAspect.value,
  })

  if (scale === 1) {
    result1x.value = processed.blob
    meta1x.value = { width: processed.width, height: processed.height }
  }
  else if (scale === 2) {
    result2x.value = processed.blob
    meta2x.value = { width: processed.width, height: processed.height }
  }
  else {
    result3x.value = processed.blob
    meta3x.value = { width: processed.width, height: processed.height }
  }
}

function clearResults() {
  result1x.value = null
  result2x.value = null
  result3x.value = null
  meta1x.value = null
  meta2x.value = null
  meta3x.value = null
}

async function handleConvert() {
  clearResults()

  await run(async () => {
    if (!selectedScales.value.length) {
      throw new Error('Select at least one scale.')
    }
    await Promise.all(selectedScales.value.map(scale => convertScale(scale)))
    return 'ok'
  })
}

function downloadScale(scale: SvgScale, blob: Blob | null) {
  if (!blob) {
    return
  }
  downloadBlob(`svg-${scale}x.${imageExtensionFor(format.value)}`, blob)
}

/** One zip holds every scale, so the user gets one download. */
async function downloadZip() {
  const extension = imageExtensionFor(format.value)
  const entries: ZipEntries = {}

  for (const card of scaleCards.value) {
    if (card.blob) {
      entries[`svg-${card.scale}x.${extension}`] = await blobToBytes(card.blob)
    }
  }

  downloadBlob('svg-raster.zip', zipInBrowser(entries))
}

function handleClear() {
  svgText.value = ''
  file.value = null
  clearResults()
  reset()
}

watch(file, async (next) => {
  if (!next) {
    return
  }
  svgText.value = await next.text()
})

useToolShortcuts({
  onRun: () => handleConvert(),
})
</script>

<template>
  <ToolPage>
    <LazyToolEditor
      v-model="svgText"
      hydrate-on-idle
      label="SVG input"
      placeholder="Paste SVG code here"
      lang="svg"
    />

    <ImageDropzone
      v-model="file"
      accept="image/svg+xml,.svg"
      prompt="Drop an SVG file here, or click to choose a file."
      hint="Max size 25 MB. SVG only."
    />

    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField label="Output format">
        <USelect
          v-model="format"
          :items="formatItems"
          class="w-full"
        />
      </UFormField>
      <UFormField
        v-if="format !== 'png'"
        label="Quality"
      >
        <div class="flex items-center gap-3">
          <USlider
            :model-value="quality"
            :min="1"
            :max="100"
            :step="1"
            class="flex-1"
            @update:model-value="quality = Number($event)"
          />
          <span class="w-10 font-mono text-sm text-muted">{{ quality }}</span>
        </div>
      </UFormField>
      <UFormField
        label="Width"
        hint="Pixels at 1x. Blank keeps the SVG size."
      >
        <UInput
          :model-value="width ?? undefined"
          type="number"
          :min="1"
          placeholder="Auto"
          class="w-full"
          @update:model-value="width = Number($event) || null"
        />
      </UFormField>
      <UFormField
        label="Height"
        hint="Pixels at 1x. Blank keeps the SVG size."
      >
        <UInput
          :model-value="height ?? undefined"
          type="number"
          :min="1"
          placeholder="Auto"
          class="w-full"
          @update:model-value="height = Number($event) || null"
        />
      </UFormField>
      <UFormField
        label="Lock aspect ratio"
        hint="The vector fits inside the width and height box. Unlock to stretch it to the exact box."
      >
        <USwitch v-model="lockAspect" />
      </UFormField>
      <UFormField
        v-if="format === 'jpeg'"
        label="Background color"
        hint="JPEG has no transparency."
      >
        <div class="flex items-center gap-2">
          <input
            v-model="background"
            type="color"
            aria-label="Background color picker"
            class="h-8 w-8 cursor-pointer rounded border border-default bg-transparent"
          >
          <UInput
            v-model="background"
            placeholder="#ffffff"
            class="flex-1 font-mono"
          />
        </div>
      </UFormField>
      <UFormField
        label="Scales"
        class="sm:col-span-2"
        hint="Each selected scale gives one raster in the zip file."
      >
        <UCheckboxGroup
          v-model="checkedScales"
          :items="scaleItems"
          orientation="horizontal"
        />
      </UFormField>
    </div>

    <ToolActions>
      <UButton
        color="primary"
        icon="i-lucide-image"
        :loading="status === 'processing'"
        @click="handleConvert"
      >
        Convert
      </UButton>
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-eraser"
        @click="handleClear"
      >
        Clear
      </UButton>
    </ToolActions>

    <ToolError
      v-if="error"
      :message="error"
    />

    <div
      v-if="scaleCards.length"
      class="space-y-4"
    >
      <div class="flex justify-end">
        <UButton
          color="primary"
          variant="subtle"
          icon="i-lucide-file-archive"
          @click="downloadZip"
        >
          Download ZIP
        </UButton>
      </div>
      <div class="grid gap-4 sm:grid-cols-3">
        <div
          v-for="card in scaleCards"
          :key="card.scale"
          class="space-y-3 rounded-md border border-default bg-elevated/40 p-4"
        >
          <div class="flex items-center justify-between gap-2">
            <div>
              <p class="text-sm font-medium text-highlighted">
                {{ card.scale }}x
              </p>
              <p
                v-if="card.meta"
                class="text-xs text-muted"
              >
                {{ card.meta.width }} × {{ card.meta.height }}
              </p>
              <p
                v-if="card.blob"
                class="text-xs text-muted"
              >
                {{ formatBytes(card.blob.size) }} · {{ card.blob.size }} bytes
              </p>
            </div>
            <UButton
              size="sm"
              color="primary"
              icon="i-lucide-download"
              @click="downloadScale(card.scale, card.blob)"
            >
              Download {{ card.scale }}x
            </UButton>
          </div>
          <img
            v-if="card.preview"
            :src="card.preview"
            :alt="`${card.scale}x SVG preview`"
            class="max-h-40 w-full rounded object-contain bg-default"
          >
        </div>
      </div>
    </div>

    <template #docs>
      <ToolDocs title="About SVG conversion">
        <div class="space-y-4 text-sm leading-relaxed text-muted">
          <p>
            The tool renders the SVG on a canvas and exports PNG, WebP, or JPEG in your browser. Your SVG data never leaves your device.
          </p>
          <p>
            Give a width, a height, or both to set the size at 1x. Each selected scale multiplies that size. The lock keeps the ratio of the vector, and the raster fits inside the width and height box. Unlock it to stretch the vector to the exact box.
          </p>
          <p>
            JPEG has no alpha channel. The tool fills the background with the color that you select, so a transparent area does not become black. PNG and WebP keep the transparency.
          </p>
          <p>
            The browser renders the SVG as an image, and an image loads no external file. A font in a <code>@font-face</code> rule does not load. The browser uses a font that your device holds instead, so the width of the text can change. Use a common font, or convert the text to paths in your editor.
          </p>
          <p>
            The browser also blocks an external image, an external stylesheet, and a script inside the SVG. An <code>&lt;image&gt;</code> element with a remote link stays empty in the output. Embed the image as a data URI to keep it. The tool makes no network request for the SVG.
          </p>
          <p>
            Each card shows the pixel size and the file size of the output.
          </p>
        </div>
        <RelatedTools
          :items="[
            { label: 'Image Studio', to: '/hub/image/studio' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
