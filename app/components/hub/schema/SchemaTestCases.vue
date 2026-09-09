<script setup lang="ts">
import type { SchemaTestCaseResult } from '#shared/utils/data/json-schema'
import { useFileDialog } from '@vueuse/core'
import { parseTestCases, runSchemaTestCases } from '#shared/utils/data/json-schema'

const props = defineProps<{
  schemaInput: string
  refSchemasInput?: string
}>()

const SAMPLE_CASES = JSON.stringify(
  [
    { name: 'Complete record', data: { id: 1, name: 'Jane Doe', email: 'jane@example.com' } },
    { name: 'Missing email', data: { id: 2, name: 'No Email' }, expectValid: false },
    { name: 'Wrong id type', data: { id: 'abc', name: 'Bad Id', email: 'a@b.com' }, expectValid: false },
  ],
  null,
  2,
)

const casesInput = ref(SAMPLE_CASES)
const { downloadText } = useDownload()

const parsed = computed(() => parseTestCases(casesInput.value))

const results = computed<SchemaTestCaseResult[]>(() => {
  if (parsed.value.error || parsed.value.cases.length === 0 || !props.schemaInput.trim()) {
    return []
  }
  return runSchemaTestCases(props.schemaInput, parsed.value.cases, props.refSchemasInput ?? '')
})

const passedCount = computed(() => results.value.filter(r => r.passed).length)

const { open: openFile, onChange } = useFileDialog({
  accept: 'application/json,.json',
  multiple: false,
})

onChange(async (files) => {
  const file = files?.[0]
  if (!file) {
    return
  }
  casesInput.value = await file.text()
})

function handleDownload() {
  downloadText('schema-test-cases.json', casesInput.value, 'application/json')
}

function handleLoadSample() {
  casesInput.value = SAMPLE_CASES
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <h3 class="text-sm font-semibold text-default">
          Test cases
        </h3>
        <UBadge
          v-if="results.length > 0"
          :color="passedCount === results.length ? 'success' : 'error'"
          variant="subtle"
          size="md"
        >
          {{ passedCount }} / {{ results.length }} passed
        </UBadge>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UButton
          size="xs"
          variant="ghost"
          color="neutral"
          icon="i-lucide-file-text"
          label="Load Sample Cases"
          @click="handleLoadSample"
        />
        <UButton
          size="xs"
          variant="ghost"
          color="neutral"
          icon="i-lucide-folder-open"
          label="Open Cases File"
          @click="openFile()"
        />
        <UButton
          size="xs"
          variant="subtle"
          color="neutral"
          icon="i-lucide-download"
          label="Download Cases"
          :disabled="!casesInput.trim()"
          @click="handleDownload"
        />
      </div>
    </div>

    <ToolError
      v-if="parsed.error"
      :message="parsed.error"
    />

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <LazyToolEditor
        v-model="casesInput"
        hydrate-on-idle
        label="Test Case Payloads"
        lang="json"
        :rows="14"
        accept=".json,application/json"
        placeholder="[{ &quot;name&quot;: &quot;case&quot;, &quot;data&quot;: {}, &quot;expectValid&quot;: true }]"
      />

      <div class="border border-default rounded-xl overflow-hidden">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-default text-muted bg-elevated/40">
              <th class="p-2 font-medium">
                Case
              </th>
              <th class="p-2 font-medium">
                Result
              </th>
              <th class="p-2 font-medium">
                Detail
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr
              v-for="row in results"
              :key="row.name"
            >
              <td class="p-2 font-medium text-default">
                {{ row.name }}
              </td>
              <td class="p-2">
                <UBadge
                  :color="row.passed ? 'success' : 'error'"
                  variant="subtle"
                  size="sm"
                >
                  {{ row.passed ? 'Pass' : 'Fail' }}
                </UBadge>
              </td>
              <td class="p-2 text-muted">
                <span v-if="row.passed && !row.expectValid">Failed validation, as expected.</span>
                <span v-else-if="row.passed">Matches the schema.</span>
                <span v-else-if="row.expectValid">{{ row.firstError ?? 'Does not match the schema.' }}</span>
                <span v-else>Expected a failure, but the payload matches.</span>
              </td>
            </tr>
            <tr v-if="results.length === 0">
              <td
                colspan="3"
                class="p-3 text-center text-muted"
              >
                Add a test case to see the result.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
