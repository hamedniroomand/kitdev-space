<script setup lang="ts">
import type { TimestampUnit } from '#shared/utils/dev/timestamp'
import {
  analyzeTimestamp,
  describeDuration,
  epochValues,
  formatInZone,
  formatIso,
} from '#shared/utils/dev/timestamp'
import { ianaTimeZones } from '#shared/utils/time-zones'

type UnitChoice = TimestampUnit | 'auto'

const UNIT_ITEMS: { label: string, value: UnitChoice }[] = [
  { label: 'Auto', value: 'auto' },
  { label: 'Seconds', value: 'seconds' },
  { label: 'Milliseconds', value: 'milliseconds' },
  { label: 'Microseconds', value: 'microseconds' },
  { label: 'Nanoseconds', value: 'nanoseconds' },
]

const input = ref('1700000000')
const compareInput = ref('')
const reverseInput = ref('')

// An empty timezone means the timezone of the browser. The prerender runs in
// the timezone of the build machine, so the browser value arrives after mount.
const controls = reactive<{ unit: UnitChoice, tz: string }>({ unit: 'auto', tz: '' })

const { buildShareUrl, canShare } = useToolQuery({ input, options: controls })
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const mounted = useMounted()

useToolSeo('timestamp')

const timeZones = ianaTimeZones()

// A share link can carry any value, so the unit needs a check here too.
const unit = computed<UnitChoice>(() =>
  UNIT_ITEMS.some(item => item.value === controls.unit) ? controls.unit : 'auto',
)

const browserZone = ref('')

const zone = computed({
  get: () => controls.tz || browserZone.value || 'UTC',
  set: (value: string) => {
    controls.tz = value
  },
})

const { result: analysis } = useLiveTool(
  () => analyzeTimestamp(input.value, unit.value),
  { runLocation: 'browser', option: () => unit.value },
)

// A composable cannot run inside a condition, so the getter falls back to now.
const relativeTime = useTimeAgo(() => analysis.value?.date ?? Date.now())

const { now, pause, resume, isActive } = useNow({ interval: 1000, controls: true })

const currentEpoch = computed(() => (mounted.value ? String(Math.floor(now.value.getTime() / 1000)) : ''))

const unitHelp = computed(() => {
  const detected = analysis.value?.unit
  if (unit.value === 'auto') {
    return detected ? `Detected ${detected} from the digit count.` : 'Read the unit from the digit count.'
  }
  return 'Read the input in this unit.'
})

const ambiguity = computed(() => analysis.value?.ambiguity ?? null)

const ambiguityMessage = computed(() => {
  const found = ambiguity.value
  if (!found) {
    return ''
  }
  return `This date has two readings: ${found.monthFirst} with the month first, or ${found.dayFirst} with the day first. `
    + `The tool used ${found.used}. Write the date as YYYY-MM-DD to remove the doubt.`
})

interface ResultRow {
  id: string
  label: string
  value: string
  note?: string
}

const rows = computed<ResultRow[]>(() => {
  const found = analysis.value
  if (!found) {
    return []
  }

  const epoch = epochValues(found.nanoseconds)
  return [
    { id: 'iso', label: 'ISO 8601', value: formatIso(found) },
    { id: 'utc', label: 'UTC', value: found.date.toUTCString() },
    { id: 'zone', label: 'Zone time', value: formatInZone(found.date, zone.value), note: zone.value },
    { id: 'seconds', label: 'Epoch seconds', value: epoch.seconds },
    { id: 'milliseconds', label: 'Epoch milliseconds', value: epoch.milliseconds },
    { id: 'microseconds', label: 'Epoch microseconds', value: epoch.microseconds },
    { id: 'nanoseconds', label: 'Epoch nanoseconds', value: epoch.nanoseconds },
  ]
})

const compareAnalysis = computed(() => analyzeTimestamp(compareInput.value, unit.value))

const duration = computed(() => {
  const from = analysis.value?.date
  const to = compareAnalysis.value?.date
  if (!from || !to) {
    return null
  }
  return describeDuration(from.getTime(), to.getTime())
})

// The duration stops at milliseconds, so a smaller difference needs the exact
// nanosecond count. Without it a sub-millisecond duration reads as zero.
const durationNote = computed(() => {
  const from = analysis.value
  const to = compareAnalysis.value
  const found = duration.value
  if (!from || !to || !found) {
    return undefined
  }

  const total = `${found.totalMilliseconds} ms in total`
  const nanoseconds = from.nanoseconds > to.nanoseconds
    ? from.nanoseconds - to.nanoseconds
    : to.nanoseconds - from.nanoseconds
  if (nanoseconds % 1_000_000n === 0n) {
    return total
  }
  return `${total}, ${nanoseconds} ns exactly`
})

const durationRows = computed(() => {
  const found = duration.value
  if (!found) {
    return []
  }
  return [
    { id: 'days', label: 'Days', value: String(found.days) },
    { id: 'hours', label: 'Hours', value: String(found.hours) },
    { id: 'minutes', label: 'Minutes', value: String(found.minutes) },
    { id: 'seconds', label: 'Seconds', value: String(found.seconds) },
    { id: 'milliseconds', label: 'Milliseconds', value: String(found.milliseconds) },
  ]
})

const reverseResult = computed(() => {
  if (!reverseInput.value) {
    return null
  }
  const date = new Date(reverseInput.value)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return {
    seconds: String(Math.floor(date.getTime() / 1000)),
    milliseconds: String(date.getTime()),
    iso: date.toISOString(),
  }
})

function setNow() {
  const target = unit.value === 'auto' ? 'seconds' : unit.value
  input.value = epochValues(BigInt(Date.now()) * 1_000_000n)[target]
}

function handleClear() {
  input.value = ''
  compareInput.value = ''
  reverseInput.value = ''
}

async function handleShare() {
  const url = buildShareUrl()
  if (url) {
    await copy(url, 'share', 'snippet')
  }
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

    <ToolResultRow
      label="Current epoch seconds"
      :value="currentEpoch"
      :description="isActive ? 'Updates every second' : 'Paused'"
    >
      <template #actions>
        <div class="flex gap-2">
          <UButton
            :label="copyLabel('clock', 'Copy')"
            size="xs"
            :color="copyColor('clock')"
            variant="subtle"
            :icon="copyIcon('clock')"
            :disabled="!currentEpoch"
            aria-label="Copy the current epoch seconds"
            @click="copy(currentEpoch, 'clock', 'result')"
          />
          <UButton
            :label="isActive ? 'Pause clock' : 'Resume clock'"
            size="xs"
            color="neutral"
            variant="ghost"
            :icon="isActive ? 'i-lucide-pause' : 'i-lucide-play'"
            @click="isActive ? pause() : resume()"
          />
        </div>
      </template>
    </ToolResultRow>

    <UFormField
      label="Timestamp or Date String"
      description="Enter a Unix timestamp (seconds or milliseconds) or an ISO 8601 date string."
    >
      <UInput
        v-model="input"
        class="w-full font-mono"
        placeholder="e.g. 1700000000 or 2024-01-01T00:00:00Z"
        aria-label="Timestamp or date string"
      />
    </UFormField>

    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField
        label="Unit"
        :help="unitHelp"
      >
        <USelectMenu
          v-model="controls.unit"
          :items="UNIT_ITEMS"
          value-key="value"
          aria-label="Unit"
          class="w-full"
        />
      </UFormField>

      <UFormField
        label="Timezone"
        help="It formats the human readable output."
      >
        <USelectMenu
          v-model="zone"
          :items="timeZones"
          :search-input="{ placeholder: 'Search timezones' }"
          aria-label="Timezone"
          class="w-full"
        />
      </UFormField>
    </div>

    <ToolActions>
      <UButton
        label="Set Now"
        icon="i-lucide-clock"
        @click="setNow"
      />
      <UButton
        v-if="canShare"
        :label="copyLabel('share', 'Share')"
        :color="copyColor('share')"
        variant="subtle"
        :icon="copyIcon('share', 'i-lucide-share-2')"
        aria-label="Copy a link to this timestamp"
        @click="handleShare"
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
      v-if="!analysis && input"
      message="The timestamp or the date format is not valid."
    />

    <UAlert
      v-if="ambiguity"
      color="warning"
      variant="subtle"
      icon="i-lucide-calendar-search"
      title="The date order is ambiguous"
      :description="ambiguityMessage"
    />

    <div
      v-if="rows.length > 0"
      class="space-y-3"
    >
      <ToolResultRow
        v-if="mounted && analysis"
        label="Relative time"
        :value="relativeTime"
      />
      <ToolResultRow
        v-for="row in rows"
        :key="row.id"
        :label="row.label"
        :value="row.value"
        :description="row.note"
      />
    </div>

    <UFormField
      label="Second Timestamp"
      description="Enter a second time to read the duration between the two times."
    >
      <UInput
        v-model="compareInput"
        class="w-full font-mono"
        placeholder="e.g. 1700086400 or 2024-01-02T00:00:00Z"
        aria-label="Second timestamp or date string"
      />
    </UFormField>

    <ToolError
      v-if="!compareAnalysis && compareInput"
      message="The second timestamp or date format is not valid."
    />

    <div
      v-if="duration"
      class="space-y-3"
    >
      <ToolResultRow
        label="Duration"
        :value="duration.text"
        :description="durationNote"
      />
      <div class="grid gap-3 sm:grid-cols-5">
        <StatCard
          v-for="row in durationRows"
          :key="row.id"
          :label="row.label"
          :value="row.value"
        />
      </div>
    </div>

    <UFormField
      label="Date to Epoch"
      description="Select a date and a time to read the epoch value. The tool reads it in the timezone of the browser."
    >
      <UInput
        v-model="reverseInput"
        type="datetime-local"
        step="1"
        class="w-full"
        aria-label="Date and time to convert to an epoch value"
      />
    </UFormField>

    <div
      v-if="reverseResult"
      class="space-y-3"
    >
      <ToolResultRow
        label="Epoch seconds from date"
        :value="reverseResult.seconds"
      />
      <ToolResultRow
        label="Epoch milliseconds from date"
        :value="reverseResult.milliseconds"
      />
      <ToolResultRow
        label="ISO 8601 from date"
        :value="reverseResult.iso"
      />
    </div>

    <template #docs>
      <ToolDocs title="About Unix Timestamps">
        <div class="space-y-4 text-muted">
          <p>
            A Unix timestamp counts elapsed time since January 1, 1970 UTC.
          </p>
          <p>
            The digit count gives the unit. Seconds use 10 digits, milliseconds use 13,
            microseconds use 16, and nanoseconds use 19.
          </p>
          <p>
            Auto mode reads 11 digits or less as seconds, 12 to 14 digits as milliseconds, 15 to 17
            digits as microseconds, and 18 digits or more as nanoseconds. Select the unit yourself
            when your value has a different count.
          </p>
          <p>
            The tool keeps the full precision of the input. A microsecond or a nanosecond value
            keeps its extra digits in the ISO 8601 output.
          </p>
          <p>
            A date such as 01/02/2024 has two readings. It is 2 January with the month first, and
            1 February with the day first. The tool shows a warning for this case. Write the date
            as YYYY-MM-DD to remove the doubt.
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
