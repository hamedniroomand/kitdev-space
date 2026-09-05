<script setup lang="ts">
const expression = ref('30 9 * * MON-FRI')
const timeZone = ref('UTC')
const description = ref('')
const nextRuns = ref<string[]>([])
const { status, error, run, reset } = useTool<string>()
const { track } = useToolAnalytics()

const timeZoneItems = [
  { label: 'UTC', value: 'UTC' },
  { label: 'America/New_York', value: 'America/New_York' },
  { label: 'Europe/London', value: 'Europe/London' },
  { label: 'Europe/Berlin', value: 'Europe/Berlin' },
  { label: 'Asia/Tehran', value: 'Asia/Tehran' },
  { label: 'Asia/Tokyo', value: 'Asia/Tokyo' }
]

useToolSeo('cron')

onMounted(() => {
  track('tool_open', { tool: 'cron' })
})

function formatRun(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timeZone.value || 'UTC',
      dateStyle: 'full',
      timeStyle: 'short'
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

async function execute() {
  description.value = ''
  nextRuns.value = []
  await run(async () => {
    try {
      const data = await $fetch<{
        result: { description: string, nextRuns: string[] }
      }>('/api/dev/cron', {
        method: 'POST',
        body: {
          expression: expression.value,
          timeZone: timeZone.value,
          count: 5
        }
      })
      description.value = data.result.description
      nextRuns.value = data.result.nextRuns
      return data.result.description
    } catch (cause) {
      const fetchError = cause as { data?: { message?: string }, statusMessage?: string }
      throw new Error(
        fetchError.data?.message || fetchError.statusMessage || 'The cron operation failed.',
        { cause }
      )
    }
  })

  if (status.value === 'success') {
    track('tool_execute', { tool: 'cron' })
  } else if (status.value === 'error') {
    track('tool_error', { tool: 'cron' })
  }
}

function handleClear() {
  description.value = ''
  nextRuns.value = []
  reset()
}

defineShortcuts({
  meta_enter: {
    usingInput: true,
    handler: () => {
      execute()
    }
  }
})
</script>

<template>
  <ToolPage>
    <template #header>
      <ToolHeader
        title="Cron Visualizer"
        description="Validate cron expressions and preview next runs."
      />
    </template>

    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-server"
      title="Processed with Bun"
      description="This tool uses Bun.cron.parse on the server."
    />

    <UFormField label="Cron expression">
      <UInput
        v-model="expression"
        placeholder="30 9 * * MON-FRI"
        class="font-mono"
      />
    </UFormField>

    <UFormField label="Timezone">
      <USelect
        v-model="timeZone"
        :items="timeZoneItems"
        class="w-full"
      />
    </UFormField>

    <ToolActions>
      <UButton
        color="primary"
        :loading="status === 'processing'"
        @click="execute"
      >
        Preview
      </UButton>
      <UButton
        color="neutral"
        variant="ghost"
        @click="handleClear"
      >
        Clear
      </UButton>
    </ToolActions>

    <ToolError
      v-if="error"
      :message="error"
    />

    <div
      v-if="description"
      class="space-y-4 rounded-md border border-default bg-elevated/40 p-4"
    >
      <div>
        <p class="text-xs text-muted">
          Summary
        </p>
        <p class="mt-1 text-sm text-highlighted">
          {{ description }}
        </p>
      </div>
      <div v-if="nextRuns.length">
        <p class="text-xs text-muted">
          Next 5 runs ({{ timeZone }})
        </p>
        <ol class="mt-2 list-decimal space-y-1 pl-5 font-mono text-sm text-highlighted">
          <li
            v-for="runIso in nextRuns"
            :key="runIso"
          >
            {{ formatRun(runIso) }}
            <span class="text-muted">· {{ runIso }}</span>
          </li>
        </ol>
      </div>
    </div>

    <template #docs>
      <DataToolDocs title="About cron">
        <p class="text-sm leading-relaxed text-muted">
          A standard cron expression has five fields: minute, hour, day of month, month, and weekday.
        </p>
        <p class="text-sm leading-relaxed text-muted">
          Nicknames like @daily and @hourly also work when Bun accepts them.
        </p>
        <DataRelatedTools
          :items="[
            { label: 'Semver Calculator', to: '/hub/dev/semver' },
            { label: 'URL Inspector', to: '/hub/network/url-inspector' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
