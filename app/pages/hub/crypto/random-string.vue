<script setup lang="ts">
import { createRandomString, type RandomCharset } from '~~/shared/utils/crypto/random-string'

const length = ref(32)
const charset = ref<RandomCharset>('alnum')
const output = ref('')
const toast = useToast()
const { status, error, result, run, reset } = useTool<string>()
const { copy, copied } = useClipboard({ legacy: true })

const charsetItems = [
  { label: 'Alphanumeric', value: 'alnum' },
  { label: 'Letters', value: 'alpha' },
  { label: 'Numbers', value: 'numeric' },
  { label: 'Hex', value: 'hex' }
]

useToolSeo('random-string')

async function generate() {
  await run(() => createRandomString({ length: length.value, charset: charset.value }))
  if (status.value === 'success' && result.value !== null) {
    output.value = result.value
  }
}

async function handleCopy() {
  if (!output.value) {
    return
  }
  await copy(output.value)
  toast.add({ title: copied.value ? 'Copied' : 'Copy failed', color: copied.value ? 'success' : 'error' })
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
    <template #header>
      <ToolHeader
        title="Random String Generator"
        description="Generate random strings."
      />
    </template>

    <UAlert
      color="neutral"
      variant="subtle"
      title="Processed locally"
      description="This tool runs in the browser."
    />

    <div class="flex flex-wrap gap-4">
      <UFormField label="Length">
        <UInput
          v-model.number="length"
          type="number"
          :min="1"
          :max="10000"
          class="w-32"
        />
      </UFormField>
      <UFormField label="Charset">
        <USelect
          v-model="charset"
          :items="charsetItems"
          class="w-48"
        />
      </UFormField>
    </div>

    <ToolActions>
      <UButton
        label="Generate"
        icon="i-lucide-shuffle"
        :loading="status === 'processing'"
        @click="generate"
      />
      <UButton
        label="Copy"
        color="neutral"
        variant="subtle"
        icon="i-lucide-copy"
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
      <DataToolDocs title="About random strings">
        <div class="space-y-4 text-muted">
          <p>
            This tool creates random text with the browser secure random API.
          </p>
          <p>
            Do not use this tool as a password manager.
          </p>
        </div>
        <DataRelatedTools
          class="mt-8"
          :items="[
            { label: 'UUID Generator', to: '/hub/crypto/uuid' },
            { label: 'Hash Generator', to: '/hub/crypto/hash-generator' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
