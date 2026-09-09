<script setup lang="ts">
import type { CropRect } from '#shared/utils/image/crop'
import type { ImageContainer } from '#shared/utils/image/exif'
import type { ImageEncodeFormat, ImageFilter, ImageFit, ImagePresetId } from '#shared/utils/image/types'
import { formatBytes } from '#shared/utils/format'
import { readImageMetadata } from '#shared/utils/image/exif'
import { imageExtensionFor } from '#shared/utils/image/format'
import { PRESET_SIZES } from '#shared/utils/image/presets'
import { readImageResponse } from '#shared/utils/image/response'
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

type CropAspectMode = 'free' | 'output' | '1:1' | '16:9' | '4:3' | '3:2'

const cropAspectItems: { label: string, value: CropAspectMode }[] = [
  { label: 'Free', value: 'free' },
  { label: 'Match the output size', value: 'output' },
  { label: 'Square (1:1)', value: '1:1' },
  { label: 'Wide (16:9)', value: '16:9' },
  { label: 'Standard (4:3)', value: '4:3' },
  { label: 'Photo (3:2)', value: '3:2' },
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

const file = ref<File | null>(null)
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
const inputBytes = ref<number | null>(null)
const outputBytes = ref<number | null>(null)
const outWidth = ref<number | null>(null)
const outHeight = ref<number | null>(null)

const { status, error, run, reset } = useTool<Blob>()

useToolSeo(props.toolId)

const sourceUrl = useObjectUrl(() => file.value)
/** The server runs the pass only when the browser cannot encode or decode the image. */
const runsOnServer = computed(() => !canProcessInBrowser(format.value) || !decodable.value)
const isCustom = computed(() => sizeMode.value === 'custom')
const resizes = computed(() => sizeMode.value !== 'original')
/**
 * A re-encode always removes the metadata. The metadata stays only when the
 * run changes no pixel and keeps the format, because then the file bytes pass
 * through.
 * ponytail: to keep the EXIF after a re-encode, copy the APP1 segment of the
 * input into the output and set the Orientation tag to 1.
 */
const canKeepMetadata = computed(() =>
  source.value?.container === format.value
  && !cropEnabled.value
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
  const [w, h] = mode.split(':').map(Number)
  return w! / h!
})

watch(file, async (selected) => {
  outputBlob.value = null
  source.value = null
  cropRect.value = null
  decodable.value = true
  animated.value = false
  reset()

  if (!selected) {
    return
  }

  // The size is read in the browser, so the preset fields start from the real size.
  const bytes = new Uint8Array(await selected.arrayBuffer())
  const meta = readImageMetadata(bytes)
  const probe = await probeImageInBrowser(selected)
  decodable.value = probe !== null
  animated.value = isAnimatedImage(bytes)

  source.value = {
    width: probe?.width ?? meta.width,
    height: probe?.height ?? meta.height,
    bytes: selected.size,
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

function setResult(blob: Blob, resultWidth: number | null, resultHeight: number | null) {
  inputBytes.value = file.value?.size ?? null
  outputBytes.value = blob.size
  outWidth.value = resultWidth
  outHeight.value = resultHeight
  outputBlob.value = blob
}

async function process() {
  outputBlob.value = null

  const passthrough = keepMetadata.value && canKeepMetadata.value
  const isBrowser = passthrough || !runsOnServer.value
  const runLocation = isBrowser ? 'browser' : 'server'

  await run(async () => {
    if (!file.value) {
      throw new Error('Choose an image file before you run the tool.')
    }

    if (passthrough) {
      setResult(file.value, source.value?.width ?? null, source.value?.height ?? null)
      return file.value
    }

    if (isBrowser) {
      const result = await processImageInBrowser(file.value, {
        cropRect: cropEnabled.value ? cropRect.value : null,
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
      })

      setResult(result.blob, result.width, result.height)
      return result.blob
    }

    // Server path: an AVIF output, or a file that the browser cannot decode.
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

    setResult(result.blob, result.width, result.height)
    return result.blob
  }, 'The image operation failed.', { runLocation, option: format.value })
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
