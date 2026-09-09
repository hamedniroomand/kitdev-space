<script setup lang="ts">
import { analyzeCron, formatCronRunLocal } from '#shared/utils/dev/cron'
import { ianaTimeZones } from '#shared/utils/time-zones'

const expression = ref('30 9 * * MON-FRI')

// An empty timezone means the timezone of the browser. The prerender runs in
// the timezone of the build machine, so the browser value arrives after mount.
const controls = reactive({ tz: '', count: 5, start: '' })

const { buildShareUrl, canShare } = useToolQuery({ input: expression, options: controls })
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const mounted = useMounted()

useToolSeo('cron')

const timeZones = ianaTimeZones()

// `controls.tz` stays empty until the user picks a zone, so a first visit does
// not write the resolved zone into the query string.
const browserZone = ref('')

const zone = computed({
  get: () => controls.tz || browserZone.value || 'UTC',
  set: (value: string) => {
    controls.tz = value
  },
})

// A share link can carry any number, so the count needs a limit here too.
const count = computed(() => Math.min(20, Math.max(1, Math.round(controls.count) || 5)))

const { error, result: schedule } = useLiveTool(() => {
  if (!mounted.value) {
    return null
  }
  return analyzeCron(expression.value, {
    count: count.value,
    from: controls.start || new Date(),
    timeZone: zone.value,
  })
}, { runLocation: 'browser' })

const rows = computed(() =>
  (schedule.value?.runs ?? []).map(iso => ({
    iso,
    utc: formatCronRunLocal(iso, 'UTC'),
    local: formatCronRunLocal(iso, zone.value),
  })),
)

onMounted(() => {
  browserZone.value = Intl.DateTimeFormat().resolvedOptions().timeZone
})

async function handleShare() {
  const url = buildShareUrl()
  if (url) {
    await copy(url, 'share', 'snippet')
  }
}

function handleReset() {
  expression.value = '30 9 * * MON-FRI'
  controls.count = 5
  controls.start = ''
  controls.tz = ''
}

useToolShortcuts({
  onCopy: () => handleShare(),
})
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
      label="Cron expression"
      help="Five fields, or a nickname such as @daily. The result updates as you type."
    >
      <UInput
        v-model="expression"
        placeholder="30 9 * * MON-FRI"
        aria-label="Cron expression"
        class="w-full"
        :ui="{ base: 'font-mono' }"
      />
    </UFormField>

    <div class="grid gap-4 sm:grid-cols-3">
      <UFormField label="Timezone">
        <USelectMenu
          v-model="zone"
          :items="timeZones"
          :search-input="{ placeholder: 'Search timezones' }"
          aria-label="Timezone"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Runs">
        <UInputNumber
          v-model="controls.count"
          :min="1"
          :max="20"
          aria-label="Number of runs"
          class="w-full"
        />
      </UFormField>

      <UFormField
        label="Start date"
        help="Optional. Read in the timezone above."
      >
        <UInput
          v-model="controls.start"
          type="datetime-local"
          aria-label="Reference start date"
          class="w-full"
        />
      </UFormField>
    </div>

    <ToolActions>
      <UButton
        v-if="canShare"
        :label="copyLabel('share', 'Share')"
        :color="copyColor('share')"
        variant="subtle"
        :icon="copyIcon('share', 'i-lucide-share-2')"
        aria-label="Copy a link to this schedule"
        @click="handleShare"
      />
      <UButton
        label="Reset"
        color="neutral"
        variant="ghost"
        icon="i-lucide-eraser"
        @click="handleReset"
      />
    </ToolActions>

    <ToolError
      v-if="error"
      :message="error"
    />

    <template v-if="schedule">
      <ToolResultRow
        label="Schedule"
        :value="schedule.description"
      />

      <UAlert
        v-if="schedule.neverRuns"
        color="warning"
        variant="subtle"
        icon="i-lucide-calendar-x"
        title="Never runs"
        description="The expression is valid, but no date matches it. Check the day of month against the month."
      />

      <UAlert
        v-else-if="schedule.runsAtStartup"
        color="neutral"
        variant="subtle"
        icon="i-lucide-power"
        title="No calendar run"
        description="A @reboot schedule runs when the host starts, so it has no next run time."
      />

      <div
        v-else-if="rows.length"
        class="overflow-x-auto rounded-md border border-default"
      >
        <table class="w-full text-sm">
          <caption class="sr-only">
            The next {{ rows.length }} runs in UTC and in {{ zone }}
          </caption>
          <thead class="bg-elevated text-left text-xs text-muted">
            <tr>
              <th scope="col" class="px-4 py-2 font-medium">
                #
              </th>
              <th scope="col" class="px-4 py-2 font-medium">
                UTC
              </th>
              <th
                v-if="zone !== 'UTC'"
                scope="col"
                class="px-4 py-2 font-medium"
              >
                {{ zone }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, index) in rows"
              :key="row.iso"
              class="border-t border-default"
            >
              <td class="px-4 py-2 text-muted">
                {{ index + 1 }}
              </td>
              <td class="px-4 py-2 font-mono text-highlighted">
                {{ row.utc }}
              </td>
              <td
                v-if="zone !== 'UTC'"
                class="px-4 py-2 font-mono text-highlighted"
              >
                {{ row.local }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template #docs>
      <ToolDocs title="About cron">
        <p class="text-sm leading-relaxed text-muted">
          A standard cron expression has five fields: minute, hour, day of month, month, and
          weekday. The nicknames @yearly, @monthly, @weekly, @daily, @hourly, and @midnight are
          short forms of a five field expression.
        </p>
        <p class="text-sm leading-relaxed text-muted">
          Cron joins the day of month field and the weekday field with OR. If you set both, the job
          runs on a day that matches one field or the other field.
        </p>

        <h3 class="text-base font-medium text-highlighted">
          Daylight saving time
        </h3>
        <p class="text-sm leading-relaxed text-muted">
          Cron reads the wall clock of the selected timezone. A timezone with daylight saving time
          moves the wall clock two times each year, so two hours in the year are different.
        </p>
        <p class="text-sm leading-relaxed text-muted">
          At the spring shift the clock moves forward and one hour does not exist. In New York on
          8 March 2026 the clock goes from 02:00 to 03:00. A job set for 02:30 has no 02:30 on that
          day, so it runs at 03:30. An hourly job loses the 02:00 run, but the time between two
          runs stays one hour.
        </p>
        <p class="text-sm leading-relaxed text-muted">
          At the autumn shift the clock moves back. One hour occurs two times. In New York on
          1 November 2026 the clock goes from 02:00 to 01:00. An hourly job runs two times at
          01:00, one time in daylight saving time and one time in standard time. A job set for a
          single time, such as 01:30, runs one time only.
        </p>
        <p class="text-sm leading-relaxed text-muted">
          Set the timezone to UTC for a schedule that must keep the same interval through the year.
          UTC has no time shift. The UTC column shows the absolute time of each run, so you can
          compare the two columns at a shift.
        </p>

        <RelatedTools
          :items="[
            { label: 'Semver Calculator', to: '/hub/dev/semver' },
            { label: 'URL Inspector', to: '/hub/network/url-inspector' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
