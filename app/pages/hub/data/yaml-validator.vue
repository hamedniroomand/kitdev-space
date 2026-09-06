<script setup lang="ts">
import { validateYaml } from '#shared/utils/data/yaml-validator'

useToolSeo('yaml-validator')

const sampleValidYaml = `server:
  port: 8080
  host: 0.0.0.0
database:
  name: production_db
  pool_size: 10
features:
  - analytics
  - caching
  - rate_limiting`

const sampleInvalidYaml = `server:
  port: 8080
    host: bad_indentation`

const input = ref(sampleValidYaml)
const { copy, label, color, icon } = useCopyFeedback()

const result = computed(() => validateYaml(input.value))

function handleLoadValid() {
  input.value = sampleValidYaml
}

function handleLoadInvalid() {
  input.value = sampleInvalidYaml
}

function handleClear() {
  input.value = ''
}

function handleCopyJson() {
  if (result.value.formattedJson) {
    copy(result.value.formattedJson)
  }
}
</script>

<template>
  <ToolPage>
    <div class="space-y-6">
      <!-- Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <div class="flex items-center gap-2">
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-check-circle"
            label="Load Valid Sample"
            @click="handleLoadValid"
          />
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-alert-circle"
            label="Load Invalid Sample"
            @click="handleLoadInvalid"
          />
        </div>

        <div class="flex items-center gap-2">
          <UBadge
            v-if="input.trim()"
            :color="result.isValid ? 'success' : 'error'"
            variant="subtle"
            size="md"
          >
            {{ result.isValid ? 'Valid YAML' : 'Syntax Error' }}
          </UBadge>

          <UButton
            v-if="result.isValid && result.formattedJson"
            :label="label()"
            :color="color()"
            :icon="icon()"
            size="xs"
            variant="subtle"
            @click="handleCopyJson"
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

      <!-- Errors Display -->
      <div
        v-if="!result.isValid && result.errors.length > 0"
        class="space-y-2"
      >
        <UAlert
          v-for="(err, idx) in result.errors"
          :key="idx"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          :title="err.line ? `Error on Line ${err.line}, Column ${err.column ?? 0}` : 'Syntax Error'"
          :description="err.message"
        />
      </div>

      <!-- Editors Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ToolEditor
          v-model="input"
          label="YAML Source"
          lang="text"
          :rows="18"
          placeholder="Paste YAML content here to validate..."
        />

        <ToolEditor
          :model-value="result.formattedJson"
          label="Parsed JSON Structure"
          lang="json"
          :rows="18"
          readonly
          placeholder="Parsed JSON output appears here when YAML is valid..."
        />
      </div>
    </div>

    <template #docs>
      <ToolDocs title="About YAML validation">
        <div class="space-y-4 text-muted">
          <p>
            This tool checks that a YAML document has a valid syntax. It names the line and the column of the first error.
          </p>
          <p>
            Most YAML errors come from the indentation. YAML uses spaces and never a tab. A tab character gives an error that is hard to see, because the two look the same on the screen.
          </p>
          <p>
            Another common error is an unquoted value that YAML reads as a different type. The words yes, no, on, and off become true or false. A version such as 1.10 becomes the number 1.1. Put quotes around a value to keep it as text.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'JSON ↔ YAML', to: '/hub/data/converters/json-yaml' },
            { label: 'JSON Formatter', to: '/hub/data/json-formatter' },
            { label: 'JSON Schema Validator', to: '/hub/data/json-schema' }
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
