<script setup lang="ts">
import type { HashAlgorithm } from '~~/shared/utils/crypto/types'

const input = ref('hello')
const algorithm = ref<HashAlgorithm>('sha256')
const output = ref('')
const toast = useToast()
const { status, error, result, run, reset } = useTool<string>()
const { copy, copied } = useClipboard({ legacy: true })
const { track } = useToolAnalytics()

const algorithmItems = [
  { label: 'SHA-256', value: 'sha256' },
  { label: 'SHA-384', value: 'sha384' },
  { label: 'SHA-512', value: 'sha512' },
  { label: 'xxHash64 (Bun Fast Hash)', value: 'xxhash64' },
  { label: 'wyhash (Bun Fast Hash)', value: 'wyhash' },
  { label: 'CRC32 (Checksum)', value: 'crc32' },
  { label: 'SHA-1 (Legacy)', value: 'sha1' },
  { label: 'MD5 (Legacy)', value: 'md5' }
]

useToolSeo('hash')

onMounted(() => {
  track('tool_open', { tool: 'hash' })
})

async function hash() {
  await run(async () => {
    try {
      const data = await $fetch<{ result: string }>('/api/crypto/hash', {
        method: 'POST',
        body: {
          input: input.value,
          algorithm: algorithm.value
        }
      })
      return data.result
    } catch (cause) {
      const fetchError = cause as { data?: { message?: string }, statusMessage?: string }
      const message = fetchError.data?.message
        || fetchError.statusMessage
        || 'The hash operation failed.'
      throw new Error(message, { cause })
    }
  })

  if (status.value === 'success' && result.value !== null) {
    output.value = result.value
    track('tool_execute', { tool: 'hash' })
  } else if (status.value === 'error') {
    track('tool_error', { tool: 'hash' })
  }
}

async function handleCopy() {
  if (!output.value) {
    return
  }
  await copy(output.value)
  toast.add({ title: copied.value ? 'Copied' : 'Copy failed', color: copied.value ? 'success' : 'error' })
  if (copied.value) {
    track('tool_copy', { tool: 'hash' })
  }
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
      hash()
    }
  }
})
</script>

<template>
  <ToolPage>
    <template #header>
      <ToolHeader
        title="Hash Generator"
        description="Generate hashes from text input."
      />
    </template>

    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-server"
      title="Processed with Bun"
      description="This tool uses Bun.CryptoHasher on the server."
    />

    <UFormField label="Algorithm">
      <USelect
        v-model="algorithm"
        :items="algorithmItems"
        class="w-56"
      />
    </UFormField>

    <UAlert
      v-if="algorithm === 'md5' || algorithm === 'sha1'"
      color="warning"
      variant="subtle"
      title="Legacy algorithm"
      description="Do not use MD5 or SHA-1 for passwords or security decisions."
    />

    <ToolEditor
      v-model="input"
      label="Input"
      placeholder="Paste text here"
    />

    <ToolActions>
      <UButton
        label="Hash"
        icon="i-lucide-hash"
        :loading="status === 'processing'"
        @click="hash"
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
      placeholder="Hash appears here"
    />

    <template #docs>
      <DataToolDocs title="About hashing">
        <div class="space-y-4 text-muted">
          <p>
            A hash turns input into a fixed-length digest.
          </p>
          <p>
            These digests are not password hashes. Do not store passwords with MD5 or SHA-1.
          </p>
        </div>
        <DataRelatedTools
          class="mt-8"
          :items="[
            { label: 'Base64 Encoder', to: '/hub/crypto/base64' },
            { label: 'Hex Encoder', to: '/hub/crypto/hex' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
