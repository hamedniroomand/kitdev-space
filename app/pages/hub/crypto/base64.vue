<script setup lang="ts">
import { decodeBase64, encodeBase64 } from '#shared/utils/crypto/base64'

const input = ref('KitDev Space')
const output = ref('')
const { status, error, result, run, reset } = useTool<string>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

useToolSeo('base64')

async function encode() {
  await run(() => encodeBase64(input.value))
  if (status.value === 'success' && result.value !== null) {
    output.value = result.value
  }
}

async function decode() {
  await run(() => decodeBase64(input.value))
  if (status.value === 'success' && result.value !== null) {
    output.value = result.value
  }
}

async function handleCopy() {
  if (!output.value) {
    return
  }
  await copy(output.value)
}

function handleClear() {
  input.value = ''
  output.value = ''
  reset()
}

defineShortcuts({
  meta_enter: {
    usingInput: true,
    handler: () => {
      encode()
    }
  }
})
</script>

<template>
  <ToolPage>
    <template #header>
      <ToolHeader
        title="Base64 Encoder"
        description="Encode and decode Base64."
      />
    </template>

    <UAlert
      color="neutral"
      variant="subtle"
      title="Processed locally"
      description="This tool runs in the browser."
    />

    <ToolEditor
      v-model="input"
      label="Input"
      placeholder="Paste text here"
    />

    <ToolActions>
      <UButton
        label="Encode"
        icon="i-lucide-lock"
        :loading="status === 'processing'"
        @click="encode"
      />
      <UButton
        label="Decode"
        color="neutral"
        variant="subtle"
        icon="i-lucide-unlock"
        @click="decode"
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
      placeholder="Result appears here"
    />

    <template #docs>
      <DataToolDocs title="About Base64">
        <div class="space-y-4 text-muted">
          <p>
            Base64 encodes binary data as text so it can travel in text-only channels.
          </p>
        </div>
        <DataRelatedTools
          class="mt-8"
          :items="[
            { label: 'Hex Encoder', to: '/hub/crypto/hex' },
            { label: 'Hash Generator', to: '/hub/crypto/hash-generator' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
