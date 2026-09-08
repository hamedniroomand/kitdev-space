<script setup lang="ts">
import { formatRelativeTime, formatUtcDate, parseTimestamp } from '#shared/utils/dev/timestamp'

const input = ref(String(Math.floor(Date.now() / 1000)))

useToolSeo('timestamp')

const parsedDate = computed(() => parseTimestamp(input.value))
useLiveTool(parsedDate)

const formattedUtc = computed(() => {
  if (!parsedDate.value) {
    return ''
  }
  return formatUtcDate(parsedDate.value)
})

const items = computed(() => {
  const date = parsedDate.value
  if (!date) {
    return []
  }

  const seconds = Math.floor(date.getTime() / 1000)
  const milliseconds = date.getTime()

  return [
    { label: 'ISO 8601', value: date.toISOString(), id: 'iso' },
    { label: 'Relative Time', value: formatRelativeTime(date), id: 'relative' },
    { label: 'UTC String', value: date.toUTCString(), id: 'utc' },
    { label: 'Local Time', value: date.toLocaleString(), id: 'local' },
    { label: 'Formatted Date', value: formattedUtc.value, id: 'formatted' },
    { label: 'Unix Seconds', value: String(seconds), id: 'seconds' },
    { label: 'Unix Milliseconds', value: String(milliseconds), id: 'ms' },
  ]
})

function setNow() {
  input.value = String(Math.floor(Date.now() / 1000))
}

function handleClear() {
  input.value = ''
}
</script>

<template>
  <ToolPage>
    <UAlert
      color="neutral"
      variant="subtle"
      title="Processed locally"
      description="This tool runs in the browser."
    />

    <UFormField
      label="Timestamp or Date String"
      description="Enter a Unix timestamp (seconds or milliseconds) or an ISO 8601 date string."
    >
      <UInput
        v-model="input"
        class="w-full font-mono"
        placeholder="e.g. 1700000000 or 2024-01-01T00:00:00Z"
      />
    </UFormField>

    <ToolActions>
      <UButton
        label="Set Now"
        icon="i-lucide-clock"
        @click="setNow"
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
      v-if="!parsedDate && input"
      message="The timestamp or the date format is not valid."
    />

    <div
      v-else-if="items.length > 0"
      class="space-y-3"
    >
      <ToolResultRow
        v-for="item in items"
        :key="item.id"
        :label="item.label"
        :value="item.value"
      />
    </div>

    <template #docs>
      <ToolDocs title="About Unix Timestamps">
        <div class="space-y-4 text-muted">
          <p>
            A Unix timestamp counts elapsed seconds since January 1, 1970 UTC.
          </p>
          <p>
            Standard Unix timestamps use 10 digits (seconds). JavaScript timestamps use 13 digits (milliseconds).
          </p>
          <p>
            ISO 8601 represents dates and times in a universal, unambiguous text format.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Cron Visualizer', to: '/hub/dev/cron' },
            { label: 'ID & Secret Generator', to: '/hub/crypto/generator' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
