<script setup lang="ts">
import type { HashAlgorithm } from '#shared/utils/crypto/types'
import { digestsMatch } from '#shared/utils/crypto/digest'
import { hashFile, hashString } from '#shared/utils/crypto/hash'
import { parseJson } from '#shared/utils/data/json'
import { stableStringify } from '#shared/utils/data/stable-json'
import { formatBytes } from '#shared/utils/format'

type Source = 'text' | 'json' | 'file'

const SOURCE_ITEMS: { label: string, value: Source, icon: string }[] = [
  { label: 'Text', value: 'text', icon: 'i-lucide-type' },
  { label: 'JSON object', value: 'json', icon: 'i-lucide-braces' },
  { label: 'File', value: 'file', icon: 'i-lucide-file' },
]

const algorithmItems = [
  { label: 'SHA-256', value: 'sha256' },
  { label: 'SHA-384', value: 'sha384' },
  { label: 'SHA-512', value: 'sha512' },
  { label: 'SHA-1 (Legacy)', value: 'sha1' },
  { label: 'MD5 (Legacy)', value: 'md5' },
  { label: 'xxHash64 (Fast Hash)', value: 'xxhash64' },
  { label: 'CRC32 (Checksum)', value: 'crc32' },
]

const source = ref<Source>('text')
const input = ref('hello')
const jsonInput = ref('{\n  "name": "KitDev",\n  "tags": ["hash", "json"],\n  "ready": true\n}')
const canonical = ref('')
const file = ref<File | null>(null)
const algorithm = ref<HashAlgorithm>('sha256')
const output = ref('')
const expected = ref('')
const bytesRead = ref(0)
const { status, error, result, run, reset } = useTool<string>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

useToolSeo('hash')

const isLegacy = computed(() => algorithm.value === 'md5' || algorithm.value === 'sha1')

/**
 * Compares the output with the hash that the user pasted.
 * `null` means that the tool made no comparison yet.
 */
const comparison = computed<{ match: boolean, error: null } | { match: null, error: string } | null>(() => {
  if (!output.value || !expected.value.trim()) {
    return null
  }
  try {
    return { match: digestsMatch(expected.value, output.value), error: null }
  }
  catch (cause) {
    return { match: null, error: cause instanceof Error ? cause.message : 'The hash is not valid.' }
  }
})

watch([source, algorithm], () => {
  output.value = ''
  canonical.value = ''
  bytesRead.value = 0
  reset()
})

async function hash() {
  output.value = ''
  bytesRead.value = 0

  await run(async () => {
    if (source.value === 'file') {
      if (!file.value) {
        throw new Error('Choose a file before you run the tool.')
      }
      return hashFile(file.value, algorithm.value, (read) => {
        bytesRead.value = read
      })
    }

    // A JSON object is hashed in its canonical form: sorted keys, no spaces.
    // Two objects with the same content then give the same digest.
    let text = input.value
    if (source.value === 'json') {
      canonical.value = stableStringify(parseJson(jsonInput.value))
      text = canonical.value
    }

    return hashString(text, algorithm.value)
  }, 'The hash operation failed.', { option: algorithm.value })

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
  jsonInput.value = ''
  canonical.value = ''
  file.value = null
  output.value = ''
  expected.value = ''
  bytesRead.value = 0
  reset()
}

useToolShortcuts({
  onRun: () => hash(),
  onCopy: () => handleCopy(),
})
</script>

<template>
  <ToolPage>
    <UAlert
      color="success"
      variant="subtle"
      icon="i-lucide-lock"
      title="The input stays in your browser"
      description="Every algorithm runs on your device. The SHA family uses Web Crypto. MD5, CRC32, and xxHash64 use WebAssembly. Nothing is uploaded."
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

    <LazyToolEditor
      v-if="source === 'text'"
      v-model="input"
      hydrate-on-idle
      label="Input"
      placeholder="Paste text here"
    />

    <template v-else-if="source === 'json'">
      <LazyToolEditor
        v-model="jsonInput"
        hydrate-on-idle
        label="JSON object"
        lang="json"
        placeholder="Paste a JSON object here"
        :rows="8"
      />
      <p class="text-xs text-muted">
        The keys are sorted at every level and the spaces are removed before the hash. The key order
        of the input does not change the digest. To reproduce it, hash the canonical text below.
      </p>
    </template>

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
      <p
        v-if="status === 'processing' && bytesRead"
        class="text-sm text-muted"
      >
        Read {{ formatBytes(bytesRead) }}
      </p>
    </template>

    <ToolActions>
      <UButton
        label="Hash"
        icon="i-lucide-hash"
        :loading="status === 'processing'"
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

    <LazyToolEditor
      v-model="output"
      hydrate-on-idle
      label="Output"
      readonly
      placeholder="Hash appears here"
    />

    <UFormField
      label="Expected hash (optional)"
      hint="Hex or Base64, upper case or lower case"
    >
      <UInput
        v-model="expected"
        placeholder="Paste the hash of the publisher"
        class="w-full font-mono"
      />
    </UFormField>

    <UAlert
      v-if="comparison?.error"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="comparison.error"
    />
    <UAlert
      v-else-if="comparison?.match === true"
      color="success"
      variant="subtle"
      icon="i-lucide-check"
      title="Match"
      description="The output is the same as the expected hash. The compare reads every byte, so it gives away no timing information."
    />
    <UAlert
      v-else-if="comparison?.match === false"
      color="error"
      variant="subtle"
      icon="i-lucide-x"
      title="Mismatch"
      description="The output is not the same as the expected hash. Check that you chose the algorithm of the publisher."
    />

    <LazyToolEditor
      v-if="source === 'json' && canonical"
      v-model="canonical"
      hydrate-on-idle
      label="Canonical JSON"
      lang="json"
      readonly
      :rows="4"
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
            reads the file in pieces and gives each piece to the hasher, so a file of up to 2 GB
            never leaves your browser and never sits in memory as one block.
          </p>
          <p>
            The JSON object source gives a stable digest for an object. The tool sorts the keys at
            every level, keeps the order of each array, and writes the text with no spaces and no
            line breaks. The same content in a different key order then gives the same hash. Use it
            as a cache key, a deduplication key, or a change detector for a config object.
          </p>
          <p>
            The JSON rules have three more effects. The tool sorts the keys by their code unit
            value, so <code>Z</code> comes before <code>a</code>. The tool writes each number in the
            standard JSON form, so <code>1.0</code> becomes <code>1</code> and <code>1e3</code>
            becomes <code>1000</code>. The tool removes a comment and a trailing comma, because it
            reads JSON5 and JSONC input. Hash the canonical text below to reproduce the digest.
          </p>
          <h3 class="font-semibold text-highlighted">
            Text encoding
          </h3>
          <p>
            The tool converts your text to UTF-8 bytes, and hashes the bytes. A character outside
            the ASCII set is more than one byte: <code>é</code> is 2 bytes and <code>😀</code> is 4
            bytes. A hash of text is a hash of bytes, so the encoding is part of the input.
          </p>
          <p>
            Three details change the digest, and each one is easy to miss. A byte order mark at the
            start of a file is 3 bytes. A Windows line break is 2 bytes, and a Unix line break is 1
            byte. A last empty line adds a byte. Compare a checksum against the exact bytes of the
            file, and use the File source for a file.
          </p>
          <p>
            Paste the hash of the publisher into the expected hash field to get a Match or a
            Mismatch result. The field accepts hex and Base64, in upper case or in lower case. The
            compare reads every byte of both values, so its run time does not depend on the content.
          </p>
          <p>
            These digests are not password hashes. A password needs a slow algorithm such as bcrypt,
            scrypt, or Argon2. Do not store a password with MD5, SHA-1, or SHA-256.
          </p>
          <p>
            A digest is also not a signature. It proves that two inputs are the same. It does not
            prove who made the input, because anybody can calculate the same digest. A signature
            needs a key: use the HMAC Generator for a shared key, or a public key signature.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'HMAC Generator', to: '/hub/crypto/hmac' },
            { label: 'Password Benchmark', to: '/hub/crypto/password-benchmark' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
