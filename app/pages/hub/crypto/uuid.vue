<script setup lang="ts">
import { createId, type IdType } from '#shared/utils/crypto/uuid'

const idType = ref<IdType>('uuidv4')
const count = ref(1)
const nanoIdLength = ref(21)
const output = ref('')
const { status, error, result, run, reset } = useTool<string>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

const typeOptions = [
  { label: 'UUID v4 (Random)', value: 'uuidv4' },
  { label: 'UUID v7 (Time-ordered)', value: 'uuidv7' },
  { label: 'ULID (Crockford Base32)', value: 'ulid' },
  { label: 'NanoID (URL-friendly)', value: 'nanoid' }
]

const quantityPresets = [1, 5, 10, 25, 50]

useToolSeo('uuid')

async function generate() {
  await run(() => {
    const size = Math.min(100, Math.max(1, Math.floor(count.value)))
    return Array.from({ length: size }, () =>
      createId(idType.value, { nanoIdLength: nanoIdLength.value })
    ).join('\n')
  })
  if (status.value === 'success' && result.value !== null) {
    output.value = result.value
  }
}

function setPresetQuantity(preset: number) {
  count.value = preset
  generate()
}

async function handleCopy() {
  if (!output.value) {
    return
  }
  await copy(output.value)
}

function handleClear() {
  output.value = ''
  reset()
}

defineShortcuts({
  meta_enter: {
    handler: () => {
      generate()
    }
  }
})
</script>

<template>
  <ToolPage>
    <UAlert
      color="neutral"
      variant="subtle"
      title="Processed locally"
      description="This tool runs in the browser."
    />

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UFormField label="Identifier Type">
        <USelect
          v-model="idType"
          :items="typeOptions"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Quantity (1-100)">
        <div class="flex items-center gap-2">
          <UInput
            v-model.number="count"
            type="number"
            :min="1"
            :max="100"
            class="w-28"
          />
          <div class="flex flex-wrap gap-1">
            <UButton
              v-for="preset in quantityPresets"
              :key="preset"
              :label="String(preset)"
              size="xs"
              color="neutral"
              :variant="count === preset ? 'solid' : 'subtle'"
              @click="setPresetQuantity(preset)"
            />
          </div>
        </div>
      </UFormField>

      <UFormField
        v-if="idType === 'nanoid'"
        label="NanoID Length (6-64)"
      >
        <UInput
          v-model.number="nanoIdLength"
          type="number"
          :min="6"
          :max="64"
          class="w-28"
        />
      </UFormField>
    </div>

    <ToolActions>
      <UButton
        label="Generate"
        icon="i-lucide-fingerprint"
        :loading="status === 'processing'"
        @click="generate"
      />
      <UButton
        :label="copyLabel()"
        :color="copyColor()"
        variant="subtle"
        :icon="copyIcon()"
        :disabled="!output"
        @click="handleCopy"
      />
      <UButton
        label="Clear"
        color="neutral"
        variant="ghost"
        icon="i-lucide-eraser"
        @click="handleClear"
      />
    </ToolActions>

    <ToolError
      v-if="error"
      :message="error"
    />

    <ToolEditor
      v-model="output"
      label="Output"
      readonly
      placeholder="Generated identifiers appear here"
    />

    <template #docs>
      <ToolDocs title="About Identifier Types">
        <div class="space-y-4 text-muted">
          <p>
            UUID version 4 uses random values from the Web Crypto API.
          </p>
          <p>
            UUID version 7 encodes a millisecond timestamp followed by random bits. This format sorts chronologically.
          </p>
          <p>
            ULID encodes a 48-bit timestamp and 80 random bits with Crockford Base32. It provides 26 URL-safe characters.
          </p>
          <p>
            NanoID creates compact, URL-safe identifiers with customizable length.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Random String Generator', to: '/hub/crypto/random-string' },
            { label: 'Hash Generator', to: '/hub/crypto/hash-generator' }
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
