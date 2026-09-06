<script setup lang="ts">
import type { CodecFormat } from '#shared/utils/dev/codec'
import { CODEC_OPTIONS, decodeWith, encodeWith } from '#shared/utils/dev/codec'

type Direction = 'encode' | 'decode'

const DIRECTION_ITEMS: { label: string, value: Direction, icon: string }[] = [
  { label: 'Encode', value: 'encode', icon: 'i-lucide-arrow-right' },
  { label: 'Decode', value: 'decode', icon: 'i-lucide-arrow-left' }
]

const SAMPLE = 'Hello, "world" & <friends>'

const format = ref<CodecFormat>('base64')
const direction = ref<Direction>('encode')
const input = ref(SAMPLE)

const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const { downloadText } = useDownload()

useToolSeo('encoder')

const activeOption = computed(
  () => CODEC_OPTIONS.find(option => option.value === format.value) ?? CODEC_OPTIONS[0]!
)

const conversion = computed(() => {
  if (!input.value) {
    return { output: '', error: null }
  }

  try {
    const output = direction.value === 'encode'
      ? encodeWith(input.value, format.value)
      : decodeWith(input.value, format.value)
    return { output, error: null }
  } catch (cause) {
    return {
      output: '',
      error: cause instanceof Error ? cause.message : 'The operation failed.'
    }
  }
})

const output = computed(() => conversion.value.output)
const error = computed(() => conversion.value.error)

/** Sends the result back to the input, so a user can chain two steps. */
function swap() {
  if (!output.value) {
    return
  }
  input.value = output.value
  direction.value = direction.value === 'encode' ? 'decode' : 'encode'
}

async function handleCopy() {
  if (output.value) {
    await copy(output.value)
  }
}

function handleDownload() {
  if (output.value) {
    downloadText(`${format.value}-${direction.value}.txt`, output.value, 'text/plain')
  }
}

function handleSample() {
  input.value = SAMPLE
  direction.value = 'encode'
}

function handleClear() {
  input.value = ''
}
</script>

<template>
  <ToolPage>
    <div class="flex flex-wrap items-end gap-4">
      <UFormField
        label="Format"
        class="min-w-56 flex-1"
        :hint="activeOption.hint"
      >
        <USelect
          v-model="format"
          :items="CODEC_OPTIONS"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Direction">
        <UTabs
          v-model="direction"
          :items="DIRECTION_ITEMS"
          :content="false"
          size="sm"
        />
      </UFormField>
    </div>

    <ToolEditor
      v-model="input"
      label="Input"
      placeholder="Paste text here"
    />

    <ToolActions>
      <UButton
        label="Swap"
        icon="i-lucide-arrow-up-down"
        :disabled="!output"
        @click="swap"
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
        label="Download"
        color="neutral"
        variant="subtle"
        icon="i-lucide-download"
        :disabled="!output"
        @click="handleDownload"
      />
      <UButton
        label="Load sample"
        color="neutral"
        variant="ghost"
        icon="i-lucide-file-text"
        @click="handleSample"
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
      <ToolDocs title="About encoding and escaping">
        <div class="space-y-4 text-muted">
          <p>
            Encoding makes text safe for another place. A URL, an HTML page, a JSON document, and a
            shell command each have characters with a special meaning. This tool covers all of them
            in one place.
          </p>
          <p>
            Base64 turns bytes into 64 safe characters. Use Base64 URL for a token or a query value,
            because it removes the characters that a URL cannot hold. Hex writes two digits for each
            byte. The escape formats add a backslash or an entity, and they keep the text readable.
          </p>
          <p>
            Choose a format, then Encode or Decode. Select Swap to send the result back to the input,
            which lets you chain two steps. Every operation runs in your browser.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'JWT Decoder', to: '/hub/crypto/jwt' },
            { label: 'Hash Generator', to: '/hub/crypto/hash-generator' },
            { label: 'URL Inspector', to: '/hub/network/url-inspector' }
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
