<script setup lang="ts">
import { useImage as useImageElement } from '@vueuse/core'
import { formatAsCssBackground, formatAsHtmlImg, parseDataUri } from '#shared/utils/image/base64'

useToolSeo('image-base64')

type ToolMode = 'image-to-base64' | 'base64-to-image'

const SAMPLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 9 6 6"/><path d="m15 9-6 6"/></svg>'

const mode = ref<ToolMode>('image-to-base64')
const file = ref<File | null>(null)
const base64Input = ref('')

const { copy, label, color, icon } = useCopyFeedback()
const { base64: dataUri } = useBase64(() => file.value ?? undefined)
const { downloadUrl } = useDownload()
// `useImage` calls `new Image()`, which the server does not have. `immediate: false`
// keeps it out of the server render. Its own watcher runs it when `dataUri` changes,
// so the preview still loads, and no request goes out while there is no file.
const { state: previewImage } = useImageElement(
  () => ({ src: dataUri.value }),
  { immediate: false },
)

const fileName = computed(() => file.value?.name ?? '')
const fileSize = computed(() => file.value?.size ?? 0)
const imageWidth = computed(() => previewImage.value?.naturalWidth ?? 0)
const imageHeight = computed(() => previewImage.value?.naturalHeight ?? 0)

function loadSample() {
  file.value = new File([SAMPLE_SVG], 'sample.svg', { type: 'image/svg+xml' })
}

function handleClear() {
  file.value = null
  base64Input.value = ''
}

const parsedInput = computed(() => {
  if (!base64Input.value.trim())
    return null
  return parseDataUri(base64Input.value)
})

const decodedDataUri = computed(() => {
  if (!parsedInput.value)
    return ''
  if (parsedInput.value.isDataUri)
    return base64Input.value.trim()
  return `data:${parsedInput.value.mimeType};base64,${parsedInput.value.base64}`
})

function handleDownloadDecoded() {
  if (!decodedDataUri.value)
    return
  downloadUrl('decoded-image.png', decodedDataUri.value)
}
</script>

<template>
  <ToolPage>
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
        <ImageDropzone
          v-if="!dataUri"
          v-model="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif,image/avif"
          hint="Max size 10 MB. PNG, JPEG, WebP, SVG, GIF, or AVIF."
        />

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

    <template #docs>
      <ToolDocs title="About Base64 images">
        <div class="space-y-4 text-muted">
          <p>
            This tool turns an image into a data URI, and a data URI back into an image. A data URI holds the image inside the text, so a CSS file or an HTML file needs no second request.
          </p>
          <p>
            Base64 makes the data about 33 percent larger. Use it for a small icon or a placeholder only. A large image is faster as a normal file, because a browser can cache it and load it in parallel.
          </p>
          <p>
            An email template is the common good use, because many mail clients block a linked image but show an inline one.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Image Studio', to: '/hub/image/studio' },
            { label: 'Placeholder Image Generator', to: '/hub/image/placeholder' },
            { label: 'Encoder & Escaper', to: '/hub/dev/encoder' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
