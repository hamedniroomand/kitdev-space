<script setup lang="ts">
import type { FaviconPackageResult } from '#server/utils/image/favicon'

const file = ref<File | null>(null)
const appName = ref('My Application')
const shortName = ref('App')
const themeColor = ref('#ffffff')

const { status, error, result, run, reset } = useTool<FaviconPackageResult>()
const { copy: copyHtml, label: htmlCopyLabel, icon: htmlCopyIcon, color: htmlCopyColor } = useCopyFeedback()
const { copy: copyManifest, label: manifestCopyLabel, icon: manifestCopyIcon, color: manifestCopyColor } = useCopyFeedback()
const { downloadBlob } = useDownload()

useToolSeo('favicon-generator')
const { reportInput } = useToolInput()

// Sample SVG icon for quick testing
const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#2563eb" />
  <circle cx="50" cy="50" r="28" fill="#ffffff" />
  <path d="M40 35 L65 50 L40 65 Z" fill="#2563eb" />
</svg>`

function loadSample() {
  reportInput('sample')
  file.value = new File([sampleSvg], 'sample-logo.svg', { type: 'image/svg+xml' })
}

async function generate() {
  if (!file.value)
    return

  await run(async () => {
    const formData = new FormData()
    formData.append('file', file.value!)
    formData.append('appName', appName.value)
    formData.append('shortName', shortName.value)
    formData.append('themeColor', themeColor.value)

    const data = await $fetch<{ result: FaviconPackageResult }>('/api/image/favicon-generator', {
      method: 'POST',
      body: formData,
    })
    return data.result
  }, 'The favicon generation failed.')
}

function downloadZip() {
  if (!result.value?.zipBase64)
    return
  const binaryString = atob(result.value.zipBase64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  downloadBlob('favicon_package.zip', new Blob([bytes], { type: 'application/zip' }))
}

function handleReset() {
  file.value = null
  reset()
}
</script>

<template>
  <ToolPage>
    <div class="space-y-6">
      <!-- Upload & Options Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="p-4 border border-default rounded-xl bg-elevated/40 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-default flex items-center gap-2">
              <UIcon
                name="i-lucide-upload"
                class="w-4 h-4 text-primary"
              />
              Source Image
            </h3>
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              label="Load Sample Logo"
              @click="loadSample"
            />
          </div>

          <ImageDropzone
            v-model="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            prompt="Drop an image here, or click to choose a file."
            hint="PNG, SVG, JPG, or WebP."
          />
        </div>

        <!-- App Configuration Panel -->
        <div class="lg:col-span-2 p-4 border border-default rounded-xl bg-elevated/40 space-y-4">
          <h3 class="text-sm font-semibold text-default flex items-center gap-2">
            <UIcon
              name="i-lucide-settings-2"
              class="w-4 h-4 text-primary"
            />
            Application Metadata
          </h3>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="space-y-1">
              <label class="text-xs font-medium text-muted">App Name</label>
              <UInput
                v-model="appName"
                placeholder="My Application"
                class="w-full text-xs"
              />
            </div>
            <div class="space-y-1">
              <label class="text-xs font-medium text-muted">Short Name</label>
              <UInput
                v-model="shortName"
                placeholder="App"
                class="w-full text-xs"
              />
            </div>
            <div class="space-y-1">
              <label class="text-xs font-medium text-muted">Theme Color</label>
              <div class="flex items-center gap-2">
                <input
                  v-model="themeColor"
                  type="color"
                  class="w-8 h-8 rounded border border-default cursor-pointer bg-transparent"
                >
                <UInput
                  v-model="themeColor"
                  placeholder="#ffffff"
                  class="flex-1 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-default">
            <div class="text-xs text-muted">
              Generates 16px, 32px, 48px, 180px, 192px, 512px, and favicon.ico
            </div>
            <div class="flex items-center gap-2">
              <UButton
                label="Clear"
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-lucide-eraser"
                :disabled="!file && !result"
                @click="handleReset"
              />
              <UButton
                label="Generate Favicon Set"
                icon="i-lucide-file-image"
                color="primary"
                size="sm"
                :loading="status === 'processing'"
                :disabled="!file"
                @click="generate"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Error alert -->
      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-circle"
        title="Generation Error"
        :description="error"
      />

      <!-- Generated Results Section -->
      <div
        v-if="result"
        class="space-y-6"
      >
        <!-- Package Download Banner -->
        <div class="p-4 rounded-xl border border-primary/40 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="space-y-0.5">
            <div class="text-sm font-semibold text-default flex items-center gap-2">
              <UIcon
                name="i-lucide-check-circle"
                class="w-4 h-4 text-success"
              />
              Favicon Package Ready
            </div>
            <div class="text-xs text-muted">
              Includes all standard PNG icon sizes, favicon.ico, site.webmanifest, and HTML snippets.
            </div>
          </div>

          <UButton
            color="primary"
            variant="solid"
            size="sm"
            icon="i-lucide-download"
            label="Download Package (.ZIP)"
            @click="downloadZip"
          />
        </div>

        <!-- Generated Icons Grid Preview -->
        <div class="p-4 border border-default rounded-xl bg-elevated/20 space-y-3">
          <h3 class="text-sm font-semibold text-default flex items-center gap-2">
            <UIcon
              name="i-lucide-layout-grid"
              class="w-4 h-4 text-primary"
            />
            Generated Icon Previews
          </h3>

          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2">
            <div
              v-for="item in result.previews"
              :key="item.name"
              class="p-3 rounded-lg border border-default bg-default flex flex-col items-center text-center space-y-2"
            >
              <div class="w-14 h-14 flex items-center justify-center rounded border border-default bg-elevated/50 p-1 overflow-hidden">
                <img
                  :src="item.dataUrl"
                  :alt="item.name"
                  class="max-w-full max-h-full object-contain"
                >
              </div>
              <div class="w-full">
                <div class="text-[11px] font-semibold text-default truncate">
                  {{ item.size }}x{{ item.size }}
                </div>
                <div class="text-[10px] text-muted font-mono truncate">
                  {{ item.name }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Code Snippets (HTML & WebManifest) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- HTML Tags -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-xs font-semibold text-default flex items-center gap-1.5">
                <UIcon
                  name="i-lucide-code-xml"
                  class="w-3.5 h-3.5 text-primary"
                />
                HTML Header Code
              </label>
              <UButton
                size="xs"
                variant="subtle"
                :label="htmlCopyLabel()"
                :color="htmlCopyColor()"
                :icon="htmlCopyIcon()"
                @click="copyHtml(result.htmlSnippet)"
              />
            </div>
            <LazyToolEditor
              hydrate-on-idle
              :model-value="result.htmlSnippet"
              label="HTML Snippet"
              lang="html"
              :rows="8"
              readonly
            />
          </div>

          <!-- WebManifest JSON -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="text-xs font-semibold text-default flex items-center gap-1.5">
                <UIcon
                  name="i-lucide-file-code"
                  class="w-3.5 h-3.5 text-primary"
                />
                site.webmanifest
              </label>
              <UButton
                size="xs"
                variant="subtle"
                :label="manifestCopyLabel()"
                :color="manifestCopyColor()"
                :icon="manifestCopyIcon()"
                @click="copyManifest(result.webmanifest)"
              />
            </div>
            <LazyToolEditor
              hydrate-on-idle
              :model-value="result.webmanifest"
              label="WebManifest"
              lang="json"
              :rows="8"
              readonly
            />
          </div>
        </div>
      </div>
    </div>

    <template #docs>
      <ToolDocs title="About favicon sets">
        <div class="space-y-4 text-muted">
          <p>
            This tool makes every favicon size from one image: the PNG sizes for a browser and a device, a multi-resolution ICO file, a web manifest, and the HTML tags. All of it arrives in one ZIP file.
          </p>
          <p>
            A browser, an iOS home screen, an Android launcher, and a Windows tile each ask for a different size. One 32 by 32 image is not enough, and a scaled large image looks soft at a small size.
          </p>
          <p>
            Use a square source image of 512 pixels or more. A simple shape reads better than a detailed one, because the icon is often shown at 16 pixels.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Image Studio', to: '/hub/image/studio' },
            { label: 'SVG to PNG / WebP', to: '/hub/image/svg-converter' },
            { label: 'Placeholder Image Generator', to: '/hub/image/placeholder' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
