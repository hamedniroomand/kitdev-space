<script setup lang="ts">
import {
  convertCurl,
  type CurlTargetLanguage
} from '#shared/utils/dev/curl-converter'
import type { ToolEditorLang } from '#shared/utils/dev/editor-lang'

useToolSeo('curl-to-code')

const samplePostCurl = `curl -X POST "https://api.example.com/v1/users" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer my-secret-token" \\
  -d '{"name": "Alice Smith", "email": "alice@example.com"}'`

const sampleGetCurl = `curl "https://api.example.com/v1/items?limit=10" \\
  -H "Accept: application/json"`

const input = ref(samplePostCurl)
const target = ref<CurlTargetLanguage>('fetch')

const { copy, label, color, icon } = useCopyFeedback()

const languages: { label: string, value: CurlTargetLanguage, editorLang: ToolEditorLang }[] = [
  { label: 'Fetch', value: 'fetch', editorLang: 'javascript' },
  { label: 'Axios', value: 'axios', editorLang: 'javascript' },
  { label: 'Python Requests', value: 'python', editorLang: 'text' },
  { label: 'Go net/http', value: 'go', editorLang: 'text' }
]

const currentEditorLang = computed(() => {
  return languages.find(l => l.value === target.value)?.editorLang || 'text'
})

const conversion = computed(() => {
  if (!input.value.trim()) return { code: '', error: null }
  try {
    const code = convertCurl(input.value, target.value)
    return { code, error: null }
  } catch (err) {
    return {
      code: '',
      error: err instanceof Error ? err.message : 'Failed to parse cURL command.'
    }
  }
})

function handleLoadSample(type: 'post' | 'get') {
  input.value = type === 'post' ? samplePostCurl : sampleGetCurl
}

function handleClear() {
  input.value = ''
}

function handleCopy() {
  if (conversion.value.code) {
    copy(conversion.value.code)
  }
}

useToolShortcuts({
  onCopy: handleCopy,
  onClear: handleClear
})

useSeoMeta({
  title: 'cURL to Code Converter — KitDev Space',
  description: 'Convert cURL commands to JavaScript Fetch, Axios, Python Requests, and Go HTTP client code.'
})
</script>

<template>
  <ToolPage
    title="cURL to Code Converter"
    description="Convert cURL syntax into modern client code for Fetch, Axios, Python Requests, and Go."
  >
    <div class="space-y-6">
      <!-- Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <div class="flex flex-wrap items-center gap-2">
          <!-- Target Language -->
          <div class="flex items-center rounded-lg border border-default p-0.5 bg-default">
            <UButton
              v-for="l in languages"
              :key="l.value"
              size="xs"
              :variant="target === l.value ? 'solid' : 'ghost'"
              :color="target === l.value ? 'primary' : 'neutral'"
              :label="l.label"
              @click="target = l.value"
            />
          </div>

          <!-- Samples -->
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-file-code"
            label="Load POST Sample"
            @click="handleLoadSample('post')"
          />
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-file-code"
            label="Load GET Sample"
            @click="handleLoadSample('get')"
          />
        </div>

        <div class="flex items-center gap-2">
          <UButton
            :label="label()"
            :color="color()"
            :icon="icon()"
            size="xs"
            variant="subtle"
            :disabled="!conversion.code"
            @click="handleCopy"
          />
          <UButton
            label="Clear"
            icon="i-lucide-eraser"
            size="xs"
            color="neutral"
            variant="ghost"
            :disabled="!input"
            @click="handleClear"
          />
        </div>
      </div>

      <!-- Error Alert -->
      <UAlert
        v-if="conversion.error"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-triangle"
        title="Parse Error"
        :description="conversion.error"
      />

      <!-- Dual Editors -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ToolEditor
          v-model="input"
          label="cURL Command"
          lang="text"
          :rows="18"
          placeholder="Paste curl command here..."
        />

        <ToolEditor
          :model-value="conversion.code"
          :label="`${languages.find(l => l.value === target)?.label || 'Generated'} Code`"
          :lang="currentEditorLang"
          :rows="18"
          readonly
          placeholder="Converted code appears here..."
        />
      </div>
    </div>
  </ToolPage>
</template>
