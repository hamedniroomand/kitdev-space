<script setup lang="ts">
import type { CropRect } from '#shared/utils/image/crop'
import type { ImageContainer } from '#shared/utils/image/exif'
import type { CropAspectId, ImageEncodeFormat, ImageFilter, ImageFit, ImagePresetId } from '#shared/utils/image/types'
import type { ImageBatchRow } from '~/utils/image/batch-process'
import { formatBytes } from '#shared/utils/format'
import { readImageMetadata } from '#shared/utils/image/exif'
import { imageExtensionFor } from '#shared/utils/image/format'
import { IMAGE_BATCH_LIMIT } from '#shared/utils/image/limits'
import { CROP_ASPECTS, PRESET_SIZES } from '#shared/utils/image/presets'
import { readImageResponse } from '#shared/utils/image/response'
import { processImageBatch } from '~/utils/image/batch-process'
import { cropImageFile } from '~/utils/image/crop-file'
import { canProcessInBrowser, probeImageInBrowser, processImageInBrowser } from '~/utils/image/process-browser'
import { isAnimatedImage } from '~/utils/image/studio-animation'

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

/** `free` and `output` are not fixed shapes, so they stay out of the shared list. */
type CropAspectMode = 'free' | 'output' | CropAspectId

const cropAspectItems: { label: string, value: CropAspectMode }[] = [
  { label: 'Free', value: 'free' },
  { label: 'Match the output size', value: 'output' },
  ...CROP_ASPECTS.map(item => ({ label: item.label, value: item.value })),
]

const sizeItems = [
  { label: 'Keep the original size', value: 'original' },
  { label: 'OpenGraph (1200×630)', value: 'open-graph' },
  { label: 'Twitter Banner (1500×500)', value: 'twitter-banner' },
  { label: 'Instagram Square (1080×1080)', value: 'instagram-square' },
  { label: 'Favicon (32×32)', value: 'favicon' },
  { label: 'Custom size', value: 'custom' },
]

const fitItems = [
  { label: 'Inside (keep the ratio)', value: 'inside' },
  { label: 'Fill (stretch)', value: 'fill' },
]

const filterItems = [
  { label: 'Lanczos3', value: 'lanczos3' },
  { label: 'Mitchell', value: 'mitchell' },
  { label: 'Cubic', value: 'cubic' },
  { label: 'Box', value: 'box' },
  { label: 'Nearest', value: 'nearest' },
]

const formatItems = [
  { label: 'WebP', value: 'webp' },
  { label: 'AVIF', value: 'avif' },
  { label: 'JPEG', value: 'jpeg' },
  { label: 'PNG', value: 'png' },
]

const rotateItems = [
  { label: 'None', value: 0 },
  { label: '90°', value: 90 },
  { label: '180°', value: 180 },
  { label: '270°', value: 270 },
]

const files = ref<File[]>([])
const file = computed<File | null>(() => files.value[0] ?? null)
const source = ref<{
  width: number | null
  height: number | null
  bytes: number
  container: ImageContainer
} | null>(null)
/** False when the browser cannot decode the file, so the run needs the server. */
const decodable = ref(true)
/** True when the file holds more than one frame. */
const animated = ref(false)

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
const keepMetadata = ref(false)
const lockAspect = ref(true)
const background = ref('#ffffff')
/** The ratio that the lock keeps. It is captured when the lock or the file changes. */
const lockedRatio = ref(1)

const cropEnabled = ref(props.crop)
const cropAspectMode = ref<CropAspectMode>('free')
const cropRect = ref<CropRect | null>(null)

const outputBlob = ref<Blob | null>(null)
const batchRows = ref<ImageBatchRow[]>([])
const batchZip = ref<Blob | null>(null)
const inputBytes = ref<number | null>(null)
const outputBytes = ref<number | null>(null)
const outWidth = ref<number | null>(null)
const outHeight = ref<number | null>(null)

const { status, error, run, reset } = useTool<Blob>()
const { downloadBlob } = useDownload()

useToolSeo(props.toolId)

const sourceUrl = useObjectUrl(() => file.value)
/** The server runs the pass only when the browser cannot encode or decode the image. */
const runsOnServer = computed(() => !canProcessInBrowser(format.value) || !decodable.value)
const isCustom = computed(() => sizeMode.value === 'custom')
const resizes = computed(() => sizeMode.value !== 'original')
/** More than one file shares the settings and gives one zip file. */
const isBatch = computed(() => files.value.length > 1)
/** A crop box needs one image, so a batch has no crop. */
const cropActive = computed(() => cropEnabled.value && !isBatch.value)
const dropzoneModel = computed(() => (isBatch.value ? files.value : file.value))
/**
 * A re-encode always removes the metadata. The metadata stays only when the
 * run changes no pixel and keeps the format, because then the file bytes pass
 * through.
 * ponytail: to keep the EXIF after a re-encode, copy the APP1 segment of the
 * input into the output and set the Orientation tag to 1.
 */
const canKeepMetadata = computed(() =>
  source.value?.container === format.value
  && !isBatch.value
  && !cropActive.value
  && !resizes.value
  && !rotate.value
  && !flip.value
  && !flop.value
  && !grayscale.value)
const filename = computed(() => `studio.${imageExtensionFor(format.value)}`)

const cropAspect = computed<number | null>(() => {
  const mode = cropAspectMode.value
  if (mode === 'free') {
    return null
  }
  if (mode === 'output') {
    return resizes.value && width.value > 0 && height.value > 0 ? width.value / height.value : null
  }
  return CROP_ASPECTS.find(item => item.value === mode)?.ratio ?? null
})

watch(files, async (selected) => {
  outputBlob.value = null
  batchRows.value = []
  batchZip.value = null
  source.value = null
  cropRect.value = null
  decodable.value = true
  animated.value = false
  reset()

  const primary = selected[0]
  if (!primary) {
    return
  }

  // The size is read in the browser, so the preset fields start from the real size.
  const bytes = new Uint8Array(await primary.arrayBuffer())
  const meta = readImageMetadata(bytes)
  const probe = await probeImageInBrowser(primary)
  decodable.value = probe !== null
  animated.value = isAnimatedImage(bytes)

  source.value = {
    width: probe?.width ?? meta.width,
    height: probe?.height ?? meta.height,
    bytes: primary.size,
    container: meta.container,
  }

  if (source.value.width && source.value.height) {
    width.value = source.value.width
    height.value = source.value.height
    captureRatio()
  }
})

watch(sizeMode, (mode) => {
  const preset = PRESET_SIZES[mode as ImagePresetId]
  if (preset) {
    width.value = preset.width
    height.value = preset.height
  }
  captureRatio()
})

function captureRatio() {
  if (width.value > 0 && height.value > 0) {
    lockedRatio.value = width.value / height.value
  }
}

watch(lockAspect, on => on && captureRatio())

function setWidth(value: number) {
  width.value = value
  if (lockAspect.value && value > 0) {
    height.value = Math.max(1, Math.round(value / lockedRatio.value))
  }
}

function setHeight(value: number) {
  height.value = value
  if (lockAspect.value && value > 0) {
    width.value = Math.max(1, Math.round(value * lockedRatio.value))
  }
}

/**
 * A new quality value updates the result. The debounce stops one encode for
 * each tick of the slider, and only a browser run re-encodes.
 */
watchDebounced(quality, () => {
  if (outputBlob.value && !runsOnServer.value) {
    process()
  }
}, { debounce: 300 })

function setResult(blob: Blob, resultWidth: number | null, resultHeight: number | null) {
  inputBytes.value = file.value?.size ?? null
  outputBytes.value = blob.size
  outWidth.value = resultWidth
  outHeight.value = resultHeight
  outputBlob.value = blob
}

/** The settings that both the single run and the batch run share. */
function browserOptions() {
  return {
    resizes: resizes.value,
    width: width.value,
    height: height.value,
    fit: fit.value,
    withoutEnlargement: withoutEnlargement.value,
    rotate: rotate.value,
    flip: flip.value,
    flop: flop.value,
    grayscale: grayscale.value,
    format: format.value,
    quality: quality.value,
    background: background.value,
  }
}

async function process() {
  outputBlob.value = null
  batchRows.value = []
  batchZip.value = null

  const passthrough = keepMetadata.value && canKeepMetadata.value
  const isBrowser = isBatch.value || passthrough || !runsOnServer.value
  const runLocation = isBrowser ? 'browser' : 'server'

  await run(async () => {
    if (!file.value) {
      throw new Error('Choose an image file before you run the tool.')
    }

    if (isBatch.value) {
      if (!canProcessInBrowser(format.value)) {
        throw new Error('A batch runs in your browser. Choose WebP, JPEG, or PNG.')
      }

      const batch = await processImageBatch(files.value, { ...browserOptions(), cropRect: null })
      batchRows.value = batch.rows
      batchZip.value = batch.zip

      if (!batch.zip) {
        throw new Error('The browser could not process any file of the batch.')
      }
      return batch.zip
    }

    if (passthrough) {
      setResult(file.value, source.value?.width ?? null, source.value?.height ?? null)
      return file.value
    }

    if (isBrowser) {
      const result = await processImageInBrowser(file.value, {
        ...browserOptions(),
        cropRect: cropActive.value ? cropRect.value : null,
      })

      setResult(result.blob, result.width, result.height)
      return result.blob
    }

    // Server path: an AVIF output, or a file that the browser cannot decode.
    const upload = cropActive.value && cropRect.value
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

    setResult(result.blob, result.width, result.height)
    return result.blob
  }, 'The image operation failed.', { runLocation, option: format.value })
}

function downloadZip() {
  if (batchZip.value) {
    downloadBlob('images.zip', batchZip.value)
  }
}

function handleClear() {
  files.value = []
  source.value = null
  outputBlob.value = null
  batchRows.value = []
  batchZip.value = null
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
      v-if="runsOnServer"
      color="info"
      variant="subtle"
      icon="i-lucide-server"
      title="Processed with Bun"
      description="An AVIF output, and a file that your browser cannot decode, run on the server with Bun. The file is processed in memory and is not stored."
    />
    <UAlert
      v-else
      color="neutral"
      variant="subtle"
      icon="i-lucide-shield-check"
      title="Processed locally"
      description="WebP, JPEG, and PNG operations run locally in your browser. No image data leaves your device."
    />

    <UAlert
      v-if="animated"
      color="warning"
      variant="subtle"
      icon="i-lucide-film"
      title="This file has more than one frame"
      description="The tool keeps the first frame only. The result is a still image."
    />

    <ImageDropzone
      :model-value="dropzoneModel"
      multiple
      :max-files="IMAGE_BATCH_LIMIT"
      prompt="Drop images here, or click to choose files."
      :hint="`Max size 25 MB for each file. Up to ${IMAGE_BATCH_LIMIT} files. JPEG, PNG, WebP, GIF, BMP, TIFF, HEIC, AVIF, or SVG.`"
      @update:files="files = $event"
    />

    <template v-if="file">
      <div class="grid gap-6 lg:grid-cols-2">
        <section class="space-y-4">
          <h2
            v-if="!isBatch"
            class="text-sm font-medium text-highlighted"
          >
            Crop
          </h2>
          <UFormField
            v-if="!isBatch"
            label="Crop the image"
            hint="The crop runs in your browser. On a server run, only the chosen pixels leave your device."
          >
            <USwitch v-model="cropEnabled" />
          </UFormField>
          <UFormField
            v-if="cropActive"
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
                :model-value="width"
                type="number"
                :disabled="!isCustom"
                class="w-full"
                @update:model-value="setWidth(Number($event))"
              />
            </UFormField>
            <UFormField label="Height">
              <UInput
                :model-value="height"
                type="number"
                :disabled="!isCustom"
                class="w-full"
                @update:model-value="setHeight(Number($event))"
              />
            </UFormField>
            <UFormField
              label="Lock the ratio"
              class="sm:col-span-2"
              hint="The other side follows the width or the height that you type."
            >
              <USwitch v-model="lockAspect" />
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
            label="Keep the metadata"
            :hint="canKeepMetadata
              ? 'The tool copies the file bytes, so the EXIF data stays.'
              : 'A re-encode removes the EXIF data. Keep the original size, format, and transform to retain it.'"
          >
            <USwitch
              v-model="keepMetadata"
              :disabled="!canKeepMetadata"
            />
          </UFormField>
          <UFormField
            v-if="format === 'jpeg'"
            label="Background"
            hint="JPEG has no transparency. A transparent pixel gets this color."
          >
            <div class="flex items-center gap-3">
              <input
                v-model="background"
                type="color"
                aria-label="Background color picker"
                class="size-10 shrink-0 cursor-pointer rounded-lg border border-default bg-transparent p-0"
              >
              <UInput
                v-model="background"
                aria-label="Background color"
                class="w-full font-mono text-sm"
              />
            </div>
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
      v-if="batchRows.length"
      class="space-y-3"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm font-medium text-highlighted">
          Batch of {{ batchRows.length }} files
        </p>
        <UButton
          v-if="batchZip"
          label="Download the zip"
          icon="i-lucide-download"
          @click="downloadZip"
        />
      </div>
      <ImageBatchTable :rows="batchRows" />
    </div>

    <div
      v-if="sourceUrl && source && !isBatch"
      class="space-y-4"
    >
      <div class="space-y-2 rounded-md border border-default bg-elevated/40 p-4">
        <p class="text-sm font-medium text-highlighted">
          Before
        </p>
        <p class="text-xs text-muted">
          {{ source.width ?? '—' }} × {{ source.height ?? '—' }} · {{ formatBytes(source.bytes) }}
          <template v-if="cropActive && cropRect">
            · crop {{ cropRect.width }} × {{ cropRect.height }}
          </template>
        </p>
        <ImageCropBox
          v-if="cropActive"
          v-model="cropRect"
          :src="sourceUrl"
          :aspect="cropAspect"
          alt="Source image with a crop box"
        />
        <img
          v-else-if="!outputBlob"
          :src="sourceUrl"
          alt="Source image preview"
          class="max-h-80 w-full rounded bg-default object-contain"
        >
      </div>

      <ImageResult
        :blob="outputBlob"
        :input-blob="file"
        :input-bytes="inputBytes"
        :output-bytes="outputBytes"
        :width="outWidth"
        :height="outHeight"
        :input-width="source.width"
        :input-height="source.height"
        :filename="filename"
      />
    </div>

    <template #docs>
      <slot name="docs" />
    </template>
  </ToolPage>
</template>
