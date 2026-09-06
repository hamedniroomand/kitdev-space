<script setup lang="ts">
import {
  htmlEntityDecode,
  htmlEntityEncode,
  urlDecode,
  urlEncode
} from '#shared/utils/dev/html-url'

const input = ref('https://example.com/search?q=hello world&category=dev')
const output = ref('')
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

useToolSeo('html-url-codec')

function handleUrlEncode() {
  output.value = urlEncode(input.value)
}

function handleUrlDecode() {
  output.value = urlDecode(input.value)
}

function handleHtmlEncode() {
  output.value = htmlEntityEncode(input.value)
}

function handleHtmlDecode() {
  output.value = htmlEntityDecode(input.value)
}

function handleSwap() {
  const temp = input.value
  input.value = output.value
  output.value = temp
}

function handleClear() {
  input.value = ''
  output.value = ''
}

async function handleCopy() {
  if (!output.value) {
    return
  }
  await copy(output.value)
}
</script>

<template>
  <ToolPage>
    <template #header>
      <ToolHeader
        title="HTML & URL Encoder / Decoder"
        description="Encode and decode HTML entities and URL strings."
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
      placeholder="Paste text, URL, or HTML here"
    />

    <ToolActions>
      <UButton
        label="URL Encode"
        icon="i-lucide-link"
        @click="handleUrlEncode"
      />
      <UButton
        label="URL Decode"
        color="neutral"
        variant="subtle"
        icon="i-lucide-unlink"
        @click="handleUrlDecode"
      />
      <UButton
        label="HTML Encode"
        icon="i-lucide-code-xml"
        @click="handleHtmlEncode"
      />
      <UButton
        label="HTML Decode"
        color="neutral"
        variant="subtle"
        icon="i-lucide-file-code"
        @click="handleHtmlDecode"
      />
      <UButton
        label="Swap"
        color="neutral"
        variant="subtle"
        icon="i-lucide-arrow-up-down"
        :disabled="!output"
        @click="handleSwap"
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

    <ToolEditor
      v-model="output"
      label="Output"
      placeholder="Result appears here"
    />

    <template #docs>
      <DataToolDocs title="About Encoding and Decoding">
        <div class="space-y-4 text-muted">
          <p>
            URL encoding replaces unsafe ASCII characters with percentage hexadecimal triplets.
          </p>
          <p>
            HTML entity encoding replaces reserved markup characters such as &lt;, &gt;, and &amp; with safe entity names.
          </p>
          <p>
            Use the swap action to chain encoding or decoding operations.
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
