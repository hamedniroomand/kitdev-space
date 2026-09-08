<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useCopyFeedback } from '../../composables/useCopyFeedback'
import { useDownload } from '../../composables/useDownload'
import { isSecretTool, MAX_SHARE_INPUT_BYTES, useToolQuery } from '../../composables/useToolQuery'

const props = withDefaults(
  defineProps<{
    result?: string | number | boolean | Record<string, any> | unknown[] | null
    input?: string
    toolId?: string
    filename?: string
    options?: Record<string, any>
    hideCopy?: boolean
    hideDownload?: boolean
    hideShare?: boolean
  }>(),
  {
    result: '',
    input: '',
    toolId: undefined,
    filename: 'result.json',
    options: undefined,
    hideCopy: false,
    hideDownload: false,
    hideShare: false,
  },
)

const inputRef = toRef(props, 'input')
const toolQuery = useToolQuery({
  toolId: computed(() => props.toolId),
  input: inputRef,
  options: props.options,
  autoRestore: false,
})

const isSecret = computed(() => isSecretTool(props.toolId))

const inputByteSize = computed(() => {
  const text = props.input || ''
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(text).length
  }
  return text.length
})

const canShareLink = computed(() => {
  if (props.hideShare || isSecret.value) {
    return false
  }
  return inputByteSize.value <= MAX_SHARE_INPUT_BYTES
})

const resultText = computed(() => {
  if (typeof props.result === 'string') {
    return props.result
  }
  if (props.result === undefined || props.result === null) {
    return ''
  }
  return JSON.stringify(props.result, null, 2)
})

const { copy, label, icon, color } = useCopyFeedback()
const { downloadText } = useDownload()

function handleCopy() {
  if (!resultText.value) {
    return
  }
  copy(resultText.value, 'copy-json', 'result')
}

function handleDownload() {
  if (!resultText.value) {
    return
  }
  downloadText(props.filename, resultText.value, 'application/json')
}

function handleShare() {
  if (!canShareLink.value) {
    return
  }
  const shareUrl = toolQuery.buildShareUrl(props.input)
  if (!shareUrl) {
    return
  }
  copy(shareUrl, 'share-link', 'snippet')
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <UButton
      v-if="!hideCopy && resultText"
      :icon="icon('copy-json', 'i-lucide-copy')"
      :color="color('copy-json')"
      variant="soft"
      size="sm"
      aria-label="Copy JSON result to clipboard"
      @click="handleCopy"
    >
      {{ label('copy-json', 'Copy JSON') }}
    </UButton>

    <UButton
      v-if="!hideDownload && resultText"
      icon="i-lucide-download"
      color="neutral"
      variant="soft"
      size="sm"
      aria-label="Download JSON result file"
      @click="handleDownload"
    >
      Download JSON
    </UButton>

    <UButton
      v-if="!hideShare && !isSecret"
      :icon="icon('share-link', 'i-lucide-share-2')"
      :color="color('share-link')"
      :disabled="!canShareLink"
      variant="soft"
      size="sm"
      aria-label="Share tool link with input"
      @click="handleShare"
    >
      {{ label('share-link', 'Share') }}
    </UButton>
  </div>
</template>
