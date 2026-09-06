<script setup lang="ts">
import type { ImageEncodeFormat, ImageFilter, ImageFit, ImagePresetId } from '#shared/utils/image/types'
import { imageExtensionFor } from '#shared/utils/image/format'
import { readImageResponse } from '#shared/utils/image/response'
import { readImageMetadata } from '#shared/utils/image/exif'
import { formatBytes } from '#shared/utils/format'
import type { CropRect } from '#shared/utils/image/crop'
import { cropImageFile } from '~/utils/image/crop-file'

type SizeMode = ImagePresetId | 'original' | 'custom'

const props = withDefaults(defineProps<{
  /** The registry id of the page. A variant page gives its own id. */
  toolId: string
  /** The size mode and the output format that are selected when the page opens. */
  sizeMode?: SizeMode
  format?: ImageEncodeFormat
  /** Turns the crop box on when the page opens. */
  crop?: boolean
}>(), { sizeMode: 'original', format: 'webp', crop: false })

type CropAspectMode = 'free' | 'output' | '1:1' | '16:9' | '4:3' | '3:2'

const cropAspectItems: { label: string, value: CropAspectMode }[] = [
  { label: 'Free', value: 'free' },
  { label: 'Match the output size', value: 'output' },
  { label: 'Square (1:1)', value: '1:1' },
  { label: 'Wide (16:9)', value: '16:9' },
  { label: 'Standard (4:3)', value: '4:3' },
  { label: 'Photo (3:2)', value: '3:2' }
]

const PRESET_SIZES: Record<ImagePresetId, { width: number, height: number }> = {
  'twitter-banner': { width: 1500, height: 500 },
  'instagram-square': { width: 1080, height: 1080 },
  'open-graph': { width: 1200, height: 630 },
  'favicon': { width: 32, height: 32 }
}

const sizeItems = [
  { label: 'Keep the original size', value: 'original' },
  { label: 'OpenGraph (1200×630)', value: 'open-graph' },
  { label: 'Twitter Banner (1500×500)', value: 'twitter-banner' },
  { label: 'Instagram Square (1080×1080)', value: 'instagram-square' },
  { label: 'Favicon (32×32)', value: 'favicon' },
  { label: 'Custom size', value: 'custom' }
]

const fitItems = [
  { label: 'Inside (keep the ratio)', value: 'inside' },
  { label: 'Fill (stretch)', value: 'fill' }
]

const filterItems = [
  { label: 'Lanczos3', value: 'lanczos3' },
  { label: 'Mitchell', value: 'mitchell' },
  { label: 'Cubic', value: 'cubic' },
  { label: 'Box', value: 'box' },
  { label: 'Nearest', value: 'nearest' }
]

const formatItems = [
  { label: 'WebP', value: 'webp' },
  { label: 'AVIF', value: 'avif' },
  { label: 'JPEG', value: 'jpeg' },
  { label: 'PNG', value: 'png' }
]

const rotateItems = [
  { label: 'None', value: 0 },
  { label: '90°', value: 90 },
  { label: '180°', value: 180 },
  { label: '270°', value: 270 }
]

const file = ref<File | null>(null)
const source = ref<{ width: number | null, height: number | null, bytes: number } | null>(null)

const sizeMode = ref<SizeMode>(props.sizeMode)
const width = ref(1200)
const height = ref(630)
const fit = ref<ImageFit>('inside')
const filter = ref<ImageFilter>('lanczos3')
const withoutEnlargement = ref(true)
const rotate = ref(0)
const flip = ref(false)
const flop = ref(false)
const grayscale = ref(false)
const format = ref<ImageEncodeFormat>(props.format)
const quality = ref(80)

const cropEnabled = ref(props.crop)
const cropAspectMode = ref<CropAspectMode>('free')
const cropRect = ref<CropRect | null>(null)

const outputBlob = ref<Blob | null>(null)
const inputBytes = ref<number | null>(null)
const outputBytes = ref<number | null>(null)
const outWidth = ref<number | null>(null)
const outHeight = ref<number | null>(null)

const { status, error, run, reset } = useTool<Blob>()

useToolSeo(props.toolId)

const sourceUrl = useObjectUrl(() => file.value)
const isCustom = computed(() => sizeMode.value === 'custom')
const resizes = computed(() => sizeMode.value !== 'original')
const filename = computed(() => `studio.${imageExtensionFor(format.value)}`)

const cropAspect = computed<number | null>(() => {
  const mode = cropAspectMode.value
  if (mode === 'free') {
    return null
  }
  if (mode === 'output') {
    return resizes.value && width.value > 0 && height.value > 0 ? width.value / height.value : null
  }
  const [w, h] = mode.split(':').map(Number)
  return w! / h!
})

watch(file, async (selected) => {
  outputBlob.value = null
  source.value = null
  cropRect.value = null
  reset()

  if (!selected) {
    return
  }

  // The size is read in the browser, so the preset fields start from the real size.
  const meta = readImageMetadata(new Uint8Array(await selected.arrayBuffer()))
  source.value = { width: meta.width, height: meta.height, bytes: selected.size }

  if (meta.width && meta.height) {
    width.value = meta.width
    height.value = meta.height
  }
})

watch(sizeMode, (mode) => {
  const preset = PRESET_SIZES[mode as ImagePresetId]
  if (preset) {
    width.value = preset.width
    height.value = preset.height
  }
})

async function process() {
  outputBlob.value = null

  await run(async () => {
    if (!file.value) {
      throw new Error('Choose an image file before you run the tool.')
    }

    // The crop runs in the browser, so only the chosen pixels leave the device.
    const upload = cropEnabled.value && cropRect.value
      ? await cropImageFile(file.value, cropRect.value)
      : file.value

    const form = new FormData()
    form.append('file', upload, file.value.name)
    form.append('format', format.value)
    form.append('quality', String(quality.value))

    if (resizes.value) {
      form.append('width', String(width.value))
      form.append('height', String(height.value))
      form.append('fit', fit.value)
      form.append('filter', filter.value)
      form.append('withoutEnlargement', withoutEnlargement.value ? '1' : '0')
    }

    if (rotate.value) {
      form.append('rotate', String(rotate.value))
    }
    if (flip.value) {
      form.append('flip', '1')
    }
    if (flop.value) {
      form.append('flop', '1')
    }
    if (grayscale.value) {
      form.append('grayscale', '1')
    }

    const response = await fetch('/api/image/process', { method: 'POST', body: form })
    const result = await readImageResponse(response, 'The image operation failed.', file.value.size)

    inputBytes.value = file.value.size
    outputBytes.value = result.outputBytes
    outWidth.value = result.width
    outHeight.value = result.height
    outputBlob.value = result.blob
    return result.blob
  })
}

function handleClear() {
  file.value = null
  source.value = null
  outputBlob.value = null
  cropRect.value = null
  inputBytes.value = null
  outputBytes.value = null
  outWidth.value = null
  outHeight.value = null
  reset()
}
</script>

<template>
  <ToolPage>
    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-server"
      title="Processed with Bun"
      description="Every setting runs in one pass, so the image is encoded once. The file is processed in memory and is not stored."
    />

    <ImageDropzone v-model="file" />

    <template v-if="file">
      <div class="grid gap-6 lg:grid-cols-2">
        <section class="space-y-4">
          <h2 class="text-sm font-medium text-highlighted">
            Crop
          </h2>
          <UFormField
            label="Crop the image"
            hint="The crop runs in your browser. Only the chosen pixels go to the server."
          >
            <USwitch v-model="cropEnabled" />
          </UFormField>
          <UFormField
            v-if="cropEnabled"
            label="Crop ratio"
          >
            <USelect
              v-model="cropAspectMode"
              :items="cropAspectItems"
              class="w-full"
            />
          </UFormField>

          <h2 class="pt-2 text-sm font-medium text-highlighted">
            Size
          </h2>
          <UFormField label="Output size">
            <USelect
              v-model="sizeMode"
              :items="sizeItems"
              class="w-full"
            />
          </UFormField>

          <div
            v-if="resizes"
            class="grid gap-3 sm:grid-cols-2"
          >
            <UFormField label="Width">
              <UInput
                v-model.number="width"
                type="number"
                :disabled="!isCustom"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Height">
              <UInput
                v-model.number="height"
                type="number"
                :disabled="!isCustom"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Fit">
              <USelect
                v-model="fit"
                :items="fitItems"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Filter">
              <USelect
                v-model="filter"
                :items="filterItems"
                class="w-full"
              />
            </UFormField>
            <UFormField
              label="Never enlarge"
              class="sm:col-span-2"
              hint="Keep a small image at its own size."
            >
              <USwitch v-model="withoutEnlargement" />
            </UFormField>
          </div>
        </section>

        <section class="space-y-4">
          <h2 class="text-sm font-medium text-highlighted">
            Transform
          </h2>
          <UFormField label="Rotate">
            <USelect
              v-model="rotate"
              :items="rotateItems"
              class="w-full"
            />
          </UFormField>
          <div class="flex flex-wrap gap-6">
            <UFormField label="Mirror vertical">
              <USwitch v-model="flip" />
            </UFormField>
            <UFormField label="Mirror horizontal">
              <USwitch v-model="flop" />
            </UFormField>
            <UFormField label="Grayscale">
              <USwitch v-model="grayscale" />
            </UFormField>
          </div>

          <h2 class="pt-2 text-sm font-medium text-highlighted">
            Output
          </h2>
          <UFormField label="Format">
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
        </section>
      </div>

      <ToolActions>
        <UButton
          label="Process"
          icon="i-lucide-wand"
          :loading="status === 'processing'"
          @click="process"
        />
        <UButton
          label="Clear"
          color="neutral"
          variant="ghost"
          icon="i-lucide-eraser"
          @click="handleClear"
        />
      </ToolActions>
    </template>

    <ToolError
      v-if="error"
      :message="error"
    />

    <div
      v-if="sourceUrl && source"
      class="grid gap-4 sm:grid-cols-2"
    >
      <div class="space-y-2 rounded-md border border-default bg-elevated/40 p-4">
        <p class="text-sm font-medium text-highlighted">
          Before
        </p>
        <p class="text-xs text-muted">
          {{ source.width ?? '—' }} × {{ source.height ?? '—' }} · {{ formatBytes(source.bytes) }}
          <template v-if="cropEnabled && cropRect">
            · crop {{ cropRect.width }} × {{ cropRect.height }}
          </template>
        </p>
        <ImageCropBox
          v-if="cropEnabled"
          v-model="cropRect"
          :src="sourceUrl"
          :aspect="cropAspect"
          alt="Source image with a crop box"
        />
        <img
          v-else
          :src="sourceUrl"
          alt="Source image preview"
          class="max-h-80 w-full rounded bg-default object-contain"
        >
      </div>

      <ImageResult
        :blob="outputBlob"
        :input-bytes="inputBytes"
        :output-bytes="outputBytes"
        :width="outWidth"
        :height="outHeight"
        :filename="filename"
      />
    </div>

    <template #docs>
      <slot name="docs" />
    </template>
  </ToolPage>
</template>
