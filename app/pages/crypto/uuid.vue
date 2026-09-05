<script setup lang="ts">
import { createUuid } from '~~/shared/utils/crypto/uuid'

const count = ref(1)
const output = ref('')
const toast = useToast()
const { status, error, result, run, reset } = useTool<string>()
const { copy } = useClipboard()

useToolSeo('uuid')

async function generate() {
  await run(() => {
    const size = Math.min(20, Math.max(1, Math.floor(count.value)))
    return Array.from({ length: size }, () => createUuid()).join('\n')
  })
  if (status.value === 'success' && result.value !== null) {
    output.value = result.value
  }
}

async function handleCopy() {
  if (!output.value) {
    return
  }
  const ok = await copy(output.value)
  toast.add({ title: ok ? 'Copied' : 'Copy failed', color: ok ? 'success' : 'error' })
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
        title="UUID Generator"
        description="Generate UUID values."
      />
    </template>

    <UAlert
      color="neutral"
      variant="subtle"
      title="Processed locally"
      description="This tool runs in the browser."
    />

    <UFormField label="Count">
      <UInput
        v-model.number="count"
        type="number"
        :min="1"
        :max="20"
        class="w-32"
      />
    </UFormField>

    <ToolActions>
      <UButton
        label="Generate"
        icon="i-lucide-fingerprint"
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
      placeholder="UUIDs appear here"
    />

    <template #docs>
      <DataToolDocs title="About UUIDs">
        <div class="space-y-4 text-muted">
          <p>
            This tool creates UUID version 4 values with the browser random API.
          </p>
        </div>
        <DataRelatedTools
          class="mt-8"
          :items="[
            { label: 'Random String Generator', to: '/crypto/random-string' },
            { label: 'Hash Generator', to: '/crypto/hash' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
