<script setup lang="ts">
import { formatRelativeTime, parseTimestamp } from '#shared/utils/dev/timestamp'

const input = ref(String(Math.floor(Date.now() / 1000)))
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

useToolSeo('timestamp')

const parsedDate = computed(() => parseTimestamp(input.value))

const formattedUtc = computed(() => {
  if (!parsedDate.value) {
    return ''
  }
  return useDateFormat(parsedDate.value, 'YYYY-MM-DD HH:mm:ss [UTC]').value
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
    { label: 'Unix Milliseconds', value: String(milliseconds), id: 'ms' }
  ]
})

function setNow() {
  input.value = String(Math.floor(Date.now() / 1000))
}

function handleClear() {
  input.value = ''
}

async function copyValue(val: string, key: string) {
  if (!val) {
    return
  }
  await copy(val, key)
}
</script>

<template>
  <ToolPage>
    <template #header>
      <ToolHeader
        title="Timestamp and Date Studio"
        description="Convert Unix timestamps, ISO 8601 strings, and relative dates."
      />
    </template>

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

    <div
      v-if="!parsedDate && input"
      class="rounded-[12px] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500"
    >
      Invalid timestamp or date format.
    </div>

    <div
      v-else-if="items.length > 0"
      class="space-y-3"
    >
      <div
        v-for="item in items"
        :key="item.id"
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[12px] border border-default bg-elevated p-4"
      >
        <div class="min-w-0 flex-1">
          <p class="font-mono text-xs font-medium text-muted uppercase">
            {{ item.label }}
          </p>
          <p class="mt-1 font-mono text-sm break-all text-highlighted">
            {{ item.value }}
          </p>
        </div>
        <UButton
          :label="copyLabel(item.id)"
          size="xs"
          :color="copyColor(item.id)"
          variant="subtle"
          :icon="copyIcon(item.id)"
          @click="copyValue(item.value, item.id)"
        />
      </div>
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
            { label: 'UUID Generator', to: '/hub/crypto/uuid' }
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
