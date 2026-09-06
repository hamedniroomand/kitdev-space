<script setup lang="ts">
import type { HashAlgorithm } from '#shared/utils/crypto/types'
import { canHashInBrowser, hashBytes, hashString } from '#shared/utils/crypto/hash'
import { formatBytes } from '#shared/utils/format'

type Source = 'text' | 'file'

const SOURCE_ITEMS: { label: string, value: Source, icon: string }[] = [
  { label: 'Text', value: 'text', icon: 'i-lucide-type' },
  { label: 'File', value: 'file', icon: 'i-lucide-file' }
]

const algorithmItems = [
  { label: 'SHA-256', value: 'sha256' },
  { label: 'SHA-384', value: 'sha384' },
  { label: 'SHA-512', value: 'sha512' },
  { label: 'SHA-1 (Legacy)', value: 'sha1' },
  { label: 'MD5 (Legacy)', value: 'md5' },
  { label: 'xxHash64 (Bun Fast Hash)', value: 'xxhash64' },
  { label: 'wyhash (Bun Fast Hash)', value: 'wyhash' },
  { label: 'CRC32 (Checksum)', value: 'crc32' }
]

const source = ref<Source>('text')
const input = ref('hello')
const file = ref<File | null>(null)
const algorithm = ref<HashAlgorithm>('sha256')
const output = ref('')
const { status, error, result, run, reset } = useTool<string>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

useToolSeo('hash')

const inBrowser = computed(() => canHashInBrowser(algorithm.value))
const isLegacy = computed(() => algorithm.value === 'md5' || algorithm.value === 'sha1')

// A file is read as bytes, so it needs the browser path.
const fileNeedsSha = computed(() => source.value === 'file' && !inBrowser.value)

watch([source, algorithm], () => {
  output.value = ''
  reset()
})

async function hash() {
  output.value = ''

  await run(async () => {
    if (source.value === 'file') {
      if (!file.value) {
        throw new Error('Choose a file before you run the tool.')
      }
      if (!inBrowser.value) {
        throw new Error('A file needs SHA-1, SHA-256, SHA-384, or SHA-512.')
      }
      return hashBytes(await file.value.arrayBuffer(), algorithm.value)
    }

    if (inBrowser.value) {
      return hashString(input.value, algorithm.value)
    }

    const data = await $fetch<{ result: string }>('/api/crypto/hash', {
      method: 'POST',
      body: {
        input: input.value,
        algorithm: algorithm.value
      }
    })
    return data.result
  }, 'The hash operation failed.')

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
  file.value = null
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
    <UAlert
      v-if="inBrowser"
      color="success"
      variant="subtle"
      icon="i-lucide-lock"
      title="The input stays in your browser"
      description="The SHA family runs with Web Crypto on your device. Nothing is uploaded."
    />
    <UAlert
      v-else
      color="info"
      variant="subtle"
      icon="i-lucide-server"
      title="Processed with Bun"
      description="Web Crypto has no MD5, CRC32, xxHash64, or wyhash. This algorithm runs on the server."
    />

    <div class="flex flex-wrap items-end gap-4">
      <UFormField label="Source">
        <UTabs
          v-model="source"
          :items="SOURCE_ITEMS"
          :content="false"
          size="sm"
        />
      </UFormField>
      <UFormField
        label="Algorithm"
        class="min-w-56"
      >
        <USelect
          v-model="algorithm"
          :items="algorithmItems"
          class="w-full"
        />
      </UFormField>
    </div>

    <UAlert
      v-if="isLegacy"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="Legacy algorithm"
      description="Do not use MD5 or SHA-1 for passwords or security decisions. Use SHA-256 or stronger."
    />

    <UAlert
      v-if="fileNeedsSha"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="This algorithm cannot hash a file"
      description="A file is hashed in the browser. Choose SHA-1, SHA-256, SHA-384, or SHA-512."
    />

    <ToolEditor
      v-if="source === 'text'"
      v-model="input"
      label="Input"
      placeholder="Paste text here"
    />

    <template v-else>
      <ImageDropzone
        v-model="file"
        accept="*/*"
        prompt="Drop a file here, or click to choose a file."
        hint="The file is read on your device. It is not uploaded."
      />
      <p
        v-if="file"
        class="text-sm text-muted"
      >
        {{ file.name }} · {{ formatBytes(file.size) }}
      </p>
    </template>

    <ToolActions>
      <UButton
        label="Hash"
        icon="i-lucide-hash"
        :loading="status === 'processing'"
        :disabled="fileNeedsSha"
        @click="hash"
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
      placeholder="Hash appears here"
    />

    <template #docs>
      <ToolDocs title="About hashing">
        <div class="space-y-4 text-muted">
          <p>
            A hash turns an input into a digest of a fixed length. The same input always gives the
            same digest. A small change to the input gives a fully different digest.
          </p>
          <p>
            Use the File source to check a download against the checksum of the publisher. The tool
            reads the file on your device with Web Crypto, so a large file never leaves your browser.
          </p>
          <p>
            These digests are not password hashes. A password needs a slow algorithm such as bcrypt,
            scrypt, or Argon2. Do not store a password with MD5, SHA-1, or SHA-256.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'HMAC Generator', to: '/hub/crypto/hmac' },
            { label: 'Password Benchmark', to: '/hub/crypto/password-benchmark' }
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
