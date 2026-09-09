<script setup lang="ts">
import { envToExample, envToJson, envToJsonWithDiagnostics, jsonToEnv } from '#shared/utils/data/env-parser'

useToolSeo('env-json')

type ConversionMode = 'env-to-json' | 'json-to-env'

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
    ALLOWED_HOSTS: 'localhost,127.0.0.1',
  },
  null,
  2,
)

const SAMPLES: Record<ConversionMode, string> = {
  'env-to-json': sampleEnv,
  'json-to-env': sampleJson,
}

const mode = ref<ConversionMode>('env-to-json')
const input = ref(sampleEnv)
const maskValues = ref(false)

const { copy, label, color, icon } = useCopyFeedback()
const { holdsSample, applySample } = useSampleInput(input, SAMPLES)

const conversion = computed(() => {
  if (!input.value.trim())
    return { output: '', error: null, diagnostics: [] }

  try {
    if (mode.value === 'env-to-json') {
      const result = envToJsonWithDiagnostics(input.value)
      const displayData = maskValues.value
        ? Object.fromEntries(Object.entries(result.data).map(([k]) => [k, '***']))
        : result.data
      return {
        output: JSON.stringify(displayData, null, 2),
        error: null,
        diagnostics: result.diagnostics,
      }
    }
    else {
      return { output: jsonToEnv(input.value), error: null, diagnostics: [] }
    }
  }
  catch (err) {
    return {
      output: '',
      error: err instanceof Error ? err.message : 'Conversion failed.',
      diagnostics: [],
    }
  }
})

const output = computed(() => conversion.value.output)
const parseError = computed(() => conversion.value.error)
const diagnostics = computed(() => conversion.value.diagnostics)
useLiveTool(conversion)

function handleModeChange(newMode: ConversionMode) {
  if (newMode === mode.value) {
    return
  }

  // Keep the work of the user. Move the result into the input, and load the
  // sample only when the input still holds a sample.
  const carried = holdsSample() ? '' : output.value
  mode.value = newMode

  if (carried) {
    input.value = carried
    return
  }

  applySample(newMode)
}

function handleLoadSample() {
  applySample(mode.value)
}

function handleClear() {
  input.value = ''
}

function handleCopy() {
  if (output.value) {
    copy(output.value)
  }
}

function downloadAs(content: string, filename: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function handleDownloadEnv() {
  if (!input.value.trim() || mode.value !== 'env-to-json') {
    return
  }
  // Re-serialize the parsed data as .env so masking has no effect on download
  const parsed = envToJson(input.value)
  downloadAs(jsonToEnv(parsed), 'output.env')
}

function handleDownloadJson() {
  if (!output.value) {
    return
  }
  downloadAs(output.value, 'output.json', 'application/json')
}

function handleDownloadExample() {
  if (!input.value.trim() || mode.value !== 'env-to-json') {
    return
  }
  downloadAs(envToExample(input.value), '.env.example')
}
</script>

<template>
  <ToolPage>
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
          <!-- Masking toggle (only for env-to-json) -->
          <div
            v-if="mode === 'env-to-json'"
            class="flex items-center gap-1.5"
          >
            <USwitch
              v-model="maskValues"
              aria-label="Mask secret values"
              size="xs"
            />
            <span class="text-xs text-muted">Mask values</span>
          </div>

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

      <!-- Download Actions (env-to-json only) -->
      <div
        v-if="mode === 'env-to-json' && output"
        class="flex flex-wrap gap-2"
      >
        <UButton
          label="Download .env"
          icon="i-lucide-download"
          size="xs"
          color="neutral"
          variant="subtle"
          @click="handleDownloadEnv"
        />
        <UButton
          label="Download .json"
          icon="i-lucide-download"
          size="xs"
          color="neutral"
          variant="subtle"
          @click="handleDownloadJson"
        />
        <UButton
          label="Download .env.example"
          icon="i-lucide-file-code"
          size="xs"
          color="neutral"
          variant="subtle"
          @click="handleDownloadExample"
        />
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

      <!-- Diagnostics -->
      <div
        v-if="diagnostics.length"
        class="rounded-xl border border-warning/40 bg-warning/5 p-3 space-y-1"
        role="alert"
        aria-label="Parse diagnostics"
      >
        <p class="text-xs font-semibold text-warning uppercase tracking-wide">
          {{ diagnostics.length }} diagnostic{{ diagnostics.length === 1 ? '' : 's' }}
        </p>
        <ul class="space-y-1">
          <li
            v-for="d in diagnostics"
            :key="d.line + d.message"
            class="text-xs font-mono"
            :class="d.severity === 'error' ? 'text-error' : 'text-warning'"
          >
            {{ d.message }}
          </li>
        </ul>
      </div>

      <!-- Editors Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LazyToolEditor
          v-model="input"
          hydrate-on-idle
          :label="mode === 'env-to-json' ? 'Input (.env format)' : 'Input (JSON format)'"
          :lang="mode === 'env-to-json' ? 'text' : 'json'"
          :rows="16"
          :placeholder="mode === 'env-to-json' ? 'Paste .env lines here...' : 'Paste JSON object here...'"
        />

        <LazyToolEditor
          hydrate-on-idle
          :model-value="output"
          :label="mode === 'env-to-json' ? 'Output (JSON format)' : 'Output (.env format)'"
          :lang="mode === 'env-to-json' ? 'json' : 'text'"
          :rows="16"
          readonly
          placeholder="Output appears here..."
        />
      </div>
    </div>

    <template #docs>
      <ToolDocs title="About .env and JSON">
        <div class="space-y-4 text-muted">
          <p>
            This tool converts a .env file to JSON, and JSON back to a .env file. A deployment platform often asks for one form when your project holds the other.
          </p>
          <p>
            <strong>Quote handling:</strong>
            Single-quoted values are taken literally. Double-quoted values unescape <code>\n</code>, <code>\r</code>, <code>\t</code>, <code>\"</code>, and <code>\\</code>.
            An inline comment after a space and <code>#</code> is removed from unquoted values.
          </p>
          <p>
            <strong>Variable handling:</strong>
            The tool does not expand <code>${VAR}</code> references or run shell commands.
            The <code>export</code> prefix is stripped on parse.
          </p>
          <p>
            <strong>Diagnostics:</strong>
            The tool reports line numbers for duplicate keys and for lines that have no <code>=</code> sign or an unclosed quote.
            No lines are dropped silently.
          </p>
          <p>
            <strong>Value masking:</strong>
            Enable the "Mask values" toggle to replace all values with <code>***</code> in the output. The original input stays unchanged.
          </p>
          <p>
            <strong>.env.example:</strong>
            The "Download .env.example" action strips all values while keeping keys, comments, and blank lines. The example file is safe to commit.
          </p>
          <p>
            Paste your file, then change the direction. The tool moves the result into the input when you change the direction, so your work is not lost. Nothing is uploaded.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'JSON Formatter', to: '/hub/data/json-formatter' },
            { label: 'JSON ↔ YAML', to: '/hub/data/converters/json-yaml' },
            { label: 'Fake Data Generator', to: '/hub/data/fake-generator' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
