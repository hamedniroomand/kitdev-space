<script setup lang="ts">
import { ref } from 'vue'
import type { FaviconPackageResult } from '~~/server/utils/image/favicon'
import { useCopyFeedback } from '../../../composables/useCopyFeedback'

const file = ref<File | null>(null)
const previewSrc = ref<string>('')
const appName = ref('My Application')
const shortName = ref('App')
const themeColor = ref('#ffffff')

const { status, error, result, run, reset } = useTool<FaviconPackageResult>()
const { copy: copyHtml, label: htmlCopyLabel, icon: htmlCopyIcon, color: htmlCopyColor } = useCopyFeedback()
const { copy: copyManifest, label: manifestCopyLabel, icon: manifestCopyIcon, color: manifestCopyColor } = useCopyFeedback()

useToolSeo('favicon-generator')

// Sample SVG icon for quick testing
const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#2563eb" />
  <circle cx="50" cy="50" r="28" fill="#ffffff" />
  <path d="M40 35 L65 50 L40 65 Z" fill="#2563eb" />
</svg>`

function loadSample() {
  const blob = new Blob([sampleSvg], { type: 'image/svg+xml' })
  const sampleFile = new File([blob], 'sample-logo.svg', { type: 'image/svg+xml' })
  file.value = sampleFile
  previewSrc.value = `data:image/svg+xml;base64,${btoa(sampleSvg)}`
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const selected = target.files?.[0]
  if (!selected) return

  file.value = selected
  const reader = new FileReader()
  reader.onload = () => {
    previewSrc.value = reader.result as string
  }
  reader.readAsDataURL(selected)
}

async function generate() {
  if (!file.value) return

  await run(async () => {
    const formData = new FormData()
    formData.append('file', file.value!)
    formData.append('appName', appName.value)
    formData.append('shortName', shortName.value)
    formData.append('themeColor', themeColor.value)

    try {
      const data = await $fetch<{ result: FaviconPackageResult }>('/api/image/favicon-generator', {
        method: 'POST',
        body: formData
      })
      return data.result
    } catch (cause) {
      const fetchError = cause as { data?: { message?: string }, statusMessage?: string }
      throw new Error(
        fetchError.data?.message || fetchError.statusMessage || 'The favicon generation failed.',
        { cause }
      )
    }
  })
}

function downloadZip() {
  if (!result.value?.zipBase64) return
  const binaryString = atob(result.value.zipBase64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  const blob = new Blob([bytes], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'favicon_package.zip'
  a.click()
  URL.revokeObjectURL(url)
}

function handleReset() {
  file.value = null
  previewSrc.value = ''
  reset()
}
</script>

<template>
  <ToolPage
    title="Favicon Set Generator"
    description="Convert a source image into standard favicon sizes, multi-resolution ICO, web manifest, and HTML tags in a ZIP download."
  >
    <div class="space-y-6">
      <!-- Upload & Options Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Image Upload Panel -->
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

          <!-- Drag and Drop Area -->
          <label class="flex flex-col items-center justify-center p-6 border-2 border-dashed border-default rounded-xl cursor-pointer hover:bg-elevated/20 transition-colors">
            <input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              class="hidden"
              @change="handleFileSelect"
            >
            <UIcon
              name="i-lucide-image"
              class="w-8 h-8 text-muted mb-2"
            />
            <span class="text-xs font-medium text-default">Select image file</span>
            <span class="text-[11px] text-muted">PNG, SVG, JPG, or WebP</span>
          </label>

          <!-- Selected file preview -->
          <div
            v-if="file"
            class="flex items-center gap-3 p-2.5 rounded-lg border border-default bg-default"
          >
            <img
              v-if="previewSrc"
              :src="previewSrc"
              alt="Source preview"
              class="w-10 h-10 object-contain rounded border border-default bg-elevated/40 p-1"
            >
            <div class="flex-1 min-w-0">
              <div class="text-xs font-medium text-default truncate">
                {{ file.name }}
              </div>
              <div class="text-[11px] text-muted font-mono">
                {{ (file.size / 1024).toFixed(1) }} KB
              </div>
            </div>
          </div>
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
            <ToolEditor
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
            <ToolEditor
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
  </ToolPage>
</template>
