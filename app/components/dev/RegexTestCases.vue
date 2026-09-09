<script setup lang="ts">
import type { RegexTestCase, RegexTestCaseFile } from '#shared/utils/dev/regex'
import { useDropZone } from '@vueuse/core'
import { parseRegexTestCases, serializeRegexTestCases } from '#shared/utils/dev/regex'

/**
 * A suite of test strings for the RegEx tester.
 *
 * The page evaluates every string in the worker and gives the result back in
 * `statuses`. This component only edits the suite, saves it, and reads it back.
 */
const props = defineProps<{
  statuses: Array<'pass' | 'fail' | 'unknown'>
  pattern: string
  flags: string
}>()

const emit = defineEmits<{
  restore: [file: RegexTestCaseFile]
}>()

const model = defineModel<RegexTestCase[]>({ required: true })

const { downloadText } = useDownload()
const fileError = ref<string | null>(null)
const dropZone = ref<HTMLElement | null>(null)

const passCount = computed(() => props.statuses.filter(status => status === 'pass').length)
const failCount = computed(() => props.statuses.filter(status => status === 'fail').length)

function statusOf(index: number) {
  return props.statuses[index] ?? 'unknown'
}

function addCase() {
  model.value = [...model.value, { text: '', expectMatch: true }]
}

function removeCase(index: number) {
  model.value = model.value.filter((_, item) => item !== index)
}

function handleDownload() {
  downloadText(
    'regex-test-cases.json',
    serializeRegexTestCases({ pattern: props.pattern, flags: props.flags, cases: model.value }),
  )
}

async function restoreFromFile(file: File) {
  const { file: parsed, error } = parseRegexTestCases(await file.text())
  fileError.value = error
  if (parsed) {
    model.value = parsed.cases
    emit('restore', parsed)
  }
}

const { isOverDropZone } = useDropZone(dropZone, {
  onDrop(files) {
    const file = files?.[0]
    if (file) {
      restoreFromFile(file)
    }
  },
})
</script>

<template>
  <section class="space-y-3">
    <div class="flex flex-wrap items-center gap-2">
      <h2 class="text-sm font-medium text-highlighted">
        Test cases
      </h2>
      <UBadge
        color="success"
        variant="subtle"
      >
        {{ passCount }} pass
      </UBadge>
      <UBadge
        color="error"
        variant="subtle"
      >
        {{ failCount }} fail
      </UBadge>
      <div class="ms-auto flex flex-wrap gap-2">
        <UButton
          label="Add test case"
          color="neutral"
          variant="subtle"
          size="xs"
          icon="i-lucide-plus"
          @click="addCase"
        />
        <UButton
          label="Download test cases"
          color="neutral"
          variant="subtle"
          size="xs"
          icon="i-lucide-download"
          :disabled="!model.length"
          @click="handleDownload"
        />
      </div>
    </div>

    <div
      ref="dropZone"
      class="space-y-2 rounded-md border border-dashed border-default p-3 transition-colors"
      :class="{ 'border-primary bg-primary/5': isOverDropZone }"
    >
      <div
        v-for="(item, index) in model"
        :key="index"
        class="flex flex-wrap items-center gap-2"
      >
        <UBadge
          :color="statusOf(index) === 'pass' ? 'success' : statusOf(index) === 'fail' ? 'error' : 'neutral'"
          variant="subtle"
          :icon="statusOf(index) === 'pass' ? 'i-lucide-check' : statusOf(index) === 'fail' ? 'i-lucide-x' : 'i-lucide-clock'"
        >
          {{ statusOf(index) === 'pass' ? 'Pass' : statusOf(index) === 'fail' ? 'Fail' : 'Waiting' }}
        </UBadge>
        <UInput
          v-model="item.text"
          class="min-w-40 flex-1"
          placeholder="Test string"
          :aria-label="`Test string ${index + 1}`"
          :ui="{ base: 'font-mono' }"
        />
        <USwitch
          v-model="item.expectMatch"
          :label="item.expectMatch ? 'Expected match' : 'Expected no match'"
          :aria-label="`Expect a match for test string ${index + 1}`"
        />
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          square
          icon="i-lucide-trash-2"
          :aria-label="`Remove test string ${index + 1}`"
          @click="removeCase(index)"
        />
      </div>

      <p class="text-xs text-muted">
        Drop a test case JSON file here to restore a suite.
      </p>
    </div>

    <ToolError
      v-if="fileError"
      :message="fileError"
    />
  </section>
</template>
