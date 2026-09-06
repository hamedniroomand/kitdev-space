<script setup lang="ts">
import { decodeHex, encodeHex } from '~~/shared/utils/crypto/hex'

const input = ref('KitDev')
const output = ref('')
const { status, error, result, run, reset } = useTool<string>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

useToolSeo('hex')

async function encode() {
  await run(() => encodeHex(input.value))
  if (status.value === 'success' && result.value !== null) {
    output.value = result.value
  }
}

async function decode() {
  await run(() => decodeHex(input.value))
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
        title="Hex Encoder"
        description="Encode and decode hex values."
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
      placeholder="Paste text or hex here"
    />

    <ToolActions>
      <UButton
        label="Encode"
        icon="i-lucide-binary"
        :loading="status === 'processing'"
        @click="encode"
      />
      <UButton
        label="Decode"
        color="neutral"
        variant="subtle"
        icon="i-lucide-text"
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
      <DataToolDocs title="About hex encoding">
        <div class="space-y-4 text-muted">
          <p>
            Hex encoding writes each byte as two hexadecimal digits.
          </p>
        </div>
        <DataRelatedTools
          class="mt-8"
          :items="[
            { label: 'Base64 Encoder', to: '/hub/crypto/base64' },
            { label: 'Hash Generator', to: '/hub/crypto/hash-generator' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
