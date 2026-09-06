<script setup lang="ts">
import { envToJson, jsonToEnv } from '#shared/utils/data/env-parser'

useToolSeo('env-json')

type ConversionMode = 'env-to-json' | 'json-to-env'

const mode = ref<ConversionMode>('env-to-json')
const input = ref('PORT=3000\nNODE_ENV=production\n# Database connection\nDB_HOST=localhost\nDB_PORT=5432\nAPI_KEY="secret-key-value"')

const { copy, label, color, icon } = useCopyFeedback()

const sampleEnv = `PORT=3000
NODE_ENV=production
# Application settings
APP_NAME="KitDev Space"
DEBUG=false
ALLOWED_HOSTS="localhost,127.0.0.1"`

const sampleJson = JSON.stringify(
  {
    PORT: '3000',
    NODE_ENV: 'production',
    APP_NAME: 'KitDev Space',
    DEBUG: 'false',
    ALLOWED_HOSTS: 'localhost,127.0.0.1'
  },
  null,
  2
)

const conversion = computed(() => {
  if (!input.value.trim()) return { output: '', error: null }

  try {
    if (mode.value === 'env-to-json') {
      const parsed = envToJson(input.value)
      return { output: JSON.stringify(parsed, null, 2), error: null }
    } else {
      return { output: jsonToEnv(input.value), error: null }
    }
  } catch (err) {
    return {
      output: '',
      error: err instanceof Error ? err.message : 'Conversion failed.'
    }
  }
})

const output = computed(() => conversion.value.output)
const parseError = computed(() => conversion.value.error)

function handleModeChange(newMode: ConversionMode) {
  mode.value = newMode
  if (newMode === 'env-to-json') {
    input.value = sampleEnv
  } else {
    input.value = sampleJson
  }
}

function handleLoadSample() {
  if (mode.value === 'env-to-json') {
    input.value = sampleEnv
  } else {
    input.value = sampleJson
  }
}

function handleClear() {
  input.value = ''
}

function handleCopy() {
  if (output.value) {
    copy(output.value)
  }
}

useSeoMeta({
  title: 'Env to JSON Converter — KitDev Space',
  description: 'Convert between .env files and JSON with type and quote support.'
})
</script>

<template>
  <ToolPage
    title="Env to JSON Converter"
    description="Convert environment files to JSON format and convert JSON to environment files."
  >
    <div class="space-y-6">
      <!-- Controls -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <div class="flex items-center gap-2">
          <div class="flex items-center rounded-lg border border-default p-0.5 bg-default">
            <UButton
              size="xs"
              :variant="mode === 'env-to-json' ? 'solid' : 'ghost'"
              color="neutral"
              label=".env → JSON"
              @click="handleModeChange('env-to-json')"
            />
            <UButton
              size="xs"
              :variant="mode === 'json-to-env' ? 'solid' : 'ghost'"
              color="neutral"
              label="JSON → .env"
              @click="handleModeChange('json-to-env')"
            />
          </div>

          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-file-text"
            label="Load Sample"
            @click="handleLoadSample"
          />
        </div>

        <div class="flex items-center gap-2">
          <UButton
            :label="label()"
            :color="color()"
            :icon="icon()"
            size="xs"
            variant="subtle"
            :disabled="!output"
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

      <!-- Error Message -->
      <UAlert
        v-if="parseError"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-circle"
        title="Conversion Error"
        :description="parseError"
      />

      <!-- Editors Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ToolEditor
          v-model="input"
          :label="mode === 'env-to-json' ? 'Input (.env format)' : 'Input (JSON format)'"
          :lang="mode === 'env-to-json' ? 'text' : 'json'"
          :rows="16"
          :placeholder="mode === 'env-to-json' ? 'Paste .env lines here...' : 'Paste JSON object here...'"
        />

        <ToolEditor
          :model-value="output"
          :label="mode === 'env-to-json' ? 'Output (JSON format)' : 'Output (.env format)'"
          :lang="mode === 'env-to-json' ? 'json' : 'text'"
          :rows="16"
          readonly
          placeholder="Output appears here..."
        />
      </div>
    </div>
  </ToolPage>
</template>
