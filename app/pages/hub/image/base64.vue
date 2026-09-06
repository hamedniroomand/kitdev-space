<script setup lang="ts">
import {
  formatAsCssBackground,
  formatAsHtmlImg,
  parseDataUri
} from '#shared/utils/image/base64'

type ToolMode = 'image-to-base64' | 'base64-to-image'

const mode = ref<ToolMode>('image-to-base64')
const dataUri = ref('')
const fileName = ref('')
const fileSize = ref(0)
const imageWidth = ref(0)
const imageHeight = ref(0)

const base64Input = ref('')
const { copy, label, color, icon } = useCopyFeedback()

// Sample 32x32 SVG icon
const sampleSvg = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMzYjgyZjYiIHN0cm9rZS13aWR0aD0iMiI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48cGF0aCBkPSJtOSA5IDYgNiIvPjxwYXRoIGQ9Im0xNSA5LTYgNiIvPjwvc3ZnPg=='

function loadSample() {
  dataUri.value = sampleSvg
  fileName.value = 'sample.svg'
  fileSize.value = 264
  imageWidth.value = 32
  imageHeight.value = 32
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  fileName.value = file.name
  fileSize.value = file.size

  const reader = new FileReader()
  reader.onload = () => {
    const result = reader.result as string
    dataUri.value = result

    const img = new Image()
    img.onload = () => {
      imageWidth.value = img.naturalWidth
      imageHeight.value = img.naturalHeight
    }
    img.src = result
  }
  reader.readAsDataURL(file)
}

function handleClear() {
  dataUri.value = ''
  fileName.value = ''
  fileSize.value = 0
  imageWidth.value = 0
  imageHeight.value = 0
  base64Input.value = ''
}

const parsedInput = computed(() => {
  if (!base64Input.value.trim()) return null
  return parseDataUri(base64Input.value)
})

const decodedDataUri = computed(() => {
  if (!parsedInput.value) return ''
  if (parsedInput.value.isDataUri) return base64Input.value.trim()
  return `data:${parsedInput.value.mimeType};base64,${parsedInput.value.base64}`
})

function handleDownloadDecoded() {
  if (!decodedDataUri.value) return
  const a = document.createElement('a')
  a.href = decodedDataUri.value
  a.download = 'decoded-image.png'
  a.click()
}

useSeoMeta({
  title: 'Image to Base64 Converter — KitDev Space',
  description: 'Convert images to Base64 Data URIs, HTML image tags, CSS backgrounds, and decode Base64 back to images.'
})
</script>

<template>
  <ToolPage
    title="Image to Base64 Converter"
    description="Convert images to Base64 data strings and decode Base64 strings to image files."
  >
    <div class="space-y-6">
      <!-- Mode & Actions Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <div class="flex items-center gap-2">
          <div class="flex items-center rounded-lg border border-default p-0.5 bg-default">
            <UButton
              size="xs"
              :variant="mode === 'image-to-base64' ? 'solid' : 'ghost'"
              color="neutral"
              label="Image → Base64"
              @click="mode = 'image-to-base64'"
            />
            <UButton
              size="xs"
              :variant="mode === 'base64-to-image' ? 'solid' : 'ghost'"
              color="neutral"
              label="Base64 → Image"
              @click="mode = 'base64-to-image'"
            />
          </div>

          <UButton
            v-if="mode === 'image-to-base64'"
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-file-image"
            label="Load Sample"
            @click="loadSample"
          />
        </div>

        <div class="flex items-center gap-2">
          <UButton
            label="Clear"
            icon="i-lucide-eraser"
            size="xs"
            color="neutral"
            variant="ghost"
            :disabled="!dataUri && !base64Input"
            @click="handleClear"
          />
        </div>
      </div>

      <!-- Mode 1: Image to Base64 -->
      <div
        v-if="mode === 'image-to-base64'"
        class="space-y-6"
      >
        <!-- File Picker -->
        <div class="p-6 border-2 border-dashed border-default hover:border-primary/60 rounded-2xl text-center cursor-pointer bg-elevated/20 transition-colors relative">
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
              Choose an image or drop file here
            </div>
            <div class="text-xs text-muted">
              PNG, JPEG, WebP, SVG, GIF, AVIF up to 10MB
            </div>
          </div>
        </div>

        <!-- Preview and Outputs if image is selected -->
        <div
          v-if="dataUri"
          class="space-y-6"
        >
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Thumbnail preview card -->
            <div class="p-4 border border-default rounded-xl bg-elevated/40 flex flex-col items-center justify-center text-center space-y-3">
              <div class="max-h-48 max-w-full flex items-center justify-center overflow-hidden rounded-lg bg-default p-2 border border-default">
                <img
                  :src="dataUri"
                  alt="Preview"
                  class="max-h-44 object-contain"
                >
              </div>
              <div class="text-xs text-muted space-y-1">
                <div class="font-semibold text-default truncate max-w-48">
                  {{ fileName || 'Selected Image' }}
                </div>
                <div v-if="imageWidth && imageHeight">
                  {{ imageWidth }} × {{ imageHeight }} px
                </div>
                <div v-if="fileSize">
                  {{ (fileSize / 1024).toFixed(1) }} KB
                </div>
              </div>
            </div>

            <!-- Output Formats -->
            <div class="md:col-span-2 space-y-4">
              <!-- Data URI -->
              <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-default">Data URI (Full Source)</span>
                  <UButton
                    size="xs"
                    variant="subtle"
                    :label="label('uri')"
                    :color="color('uri')"
                    :icon="icon('uri')"
                    @click="copy(dataUri, 'uri')"
                  />
                </div>
                <UTextarea
                  :model-value="dataUri"
                  readonly
                  :rows="3"
                  class="font-mono text-xs w-full"
                />
              </div>

              <!-- HTML img Tag -->
              <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-default">HTML &lt;img&gt; Tag</span>
                  <UButton
                    size="xs"
                    variant="subtle"
                    :label="label('html')"
                    :color="color('html')"
                    :icon="icon('html')"
                    @click="copy(formatAsHtmlImg(dataUri, fileName || 'Image'), 'html')"
                  />
                </div>
                <UInput
                  :model-value="formatAsHtmlImg(dataUri, fileName || 'Image')"
                  readonly
                  class="font-mono text-xs w-full"
                />
              </div>

              <!-- CSS Background Image -->
              <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-default">CSS background-image</span>
                  <UButton
                    size="xs"
                    variant="subtle"
                    :label="label('css')"
                    :color="color('css')"
                    :icon="icon('css')"
                    @click="copy(formatAsCssBackground(dataUri), 'css')"
                  />
                </div>
                <UInput
                  :model-value="formatAsCssBackground(dataUri)"
                  readonly
                  class="font-mono text-xs w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mode 2: Base64 to Image -->
      <div
        v-else
        class="space-y-6"
      >
        <div class="space-y-2">
          <label class="block text-sm font-medium text-default">
            Base64 String or Data URI
          </label>
          <UTextarea
            v-model="base64Input"
            :rows="6"
            placeholder="Paste raw Base64 string or data:image/... URI..."
            class="font-mono text-xs w-full"
          />
        </div>

        <div
          v-if="decodedDataUri"
          class="p-6 border border-default rounded-2xl bg-elevated/40 text-center space-y-4 max-w-md mx-auto"
        >
          <div class="text-xs font-medium text-muted uppercase tracking-wider">
            Decoded Image Preview
          </div>
          <div class="max-h-64 flex items-center justify-center overflow-hidden rounded-lg bg-default p-2 border border-default">
            <img
              :src="decodedDataUri"
              alt="Decoded preview"
              class="max-h-60 object-contain"
            >
          </div>
          <div>
            <UButton
              label="Download Image"
              icon="i-lucide-download"
              color="primary"
              variant="solid"
              @click="handleDownloadDecoded"
            />
          </div>
        </div>
      </div>
    </div>
  </ToolPage>
</template>
