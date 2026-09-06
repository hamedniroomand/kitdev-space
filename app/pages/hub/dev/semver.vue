<script setup lang="ts">
type SemverAction = 'satisfies' | 'sort' | 'bump'
type SemverRelease = 'major' | 'minor' | 'patch'

const action = ref<SemverAction>('satisfies')
const version = ref('1.2.3')
const range = ref('^1.0.0')
const versionsText = ref('1.10.0\n1.2.0\n1.9.0')
const release = ref<SemverRelease>('patch')
const output = ref('')
const { status, error, run, reset } = useTool<string>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const { track } = useToolAnalytics()

const actionItems = [
  { label: 'Satisfies range', value: 'satisfies' },
  { label: 'Sort versions', value: 'sort' },
  { label: 'Bump version', value: 'bump' }
]

const releaseItems = [
  { label: 'Patch', value: 'patch' },
  { label: 'Minor', value: 'minor' },
  { label: 'Major', value: 'major' }
]

useToolSeo('semver')

onMounted(() => {
  track('tool_open', { tool: 'semver' })
})

async function execute() {
  output.value = ''
  await run(async () => {
    try {
      const body: Record<string, unknown> = { action: action.value }
      if (action.value === 'satisfies') {
        body.version = version.value
        body.range = range.value
      } else if (action.value === 'sort') {
        body.versions = versionsText.value
      } else {
        body.version = version.value
        body.release = release.value
      }

      const data = await $fetch<{
        result: { ok?: boolean, versions?: string[], version?: string }
      }>('/api/dev/semver', {
        method: 'POST',
        body
      })

      let text = ''
      if (typeof data.result.ok === 'boolean') {
        text = data.result.ok
          ? 'true — version satisfies range'
          : 'false — version does not satisfy range'
      } else if (data.result.versions) {
        text = data.result.versions.join('\n')
      } else {
        text = data.result.version ?? ''
      }
      output.value = text
      return text
    } catch (cause) {
      const fetchError = cause as { data?: { message?: string }, statusMessage?: string }
      throw new Error(
        fetchError.data?.message || fetchError.statusMessage || 'The semver operation failed.',
        { cause }
      )
    }
  })

  if (status.value === 'success') {
    track('tool_execute', { tool: 'semver' })
  } else if (status.value === 'error') {
    track('tool_error', { tool: 'semver' })
  }
}

async function handleCopy() {
  if (!output.value) {
    return
  }
  await copy(output.value)
}

function handleClear() {
  output.value = ''
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
        title="Semver Calculator"
        description="Test ranges, sort versions, and bump releases."
      />
    </template>

    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-server"
      title="Processed with Bun"
      description="This tool uses Bun.semver on the server."
    />

    <UFormField label="Action">
      <USelect
        v-model="action"
        :items="actionItems"
        class="w-full"
      />
    </UFormField>

    <template v-if="action === 'satisfies'">
      <UFormField label="Version">
        <UInput
          v-model="version"
          placeholder="1.2.3"
        />
      </UFormField>
      <UFormField label="Range">
        <UInput
          v-model="range"
          placeholder="^1.0.0"
        />
      </UFormField>
    </template>

    <ToolEditor
      v-else-if="action === 'sort'"
      v-model="versionsText"
      label="Versions (one per line)"
      :rows="8"
    />

    <template v-else>
      <UFormField label="Version">
        <UInput
          v-model="version"
          placeholder="1.2.3"
        />
      </UFormField>
      <UFormField label="Bump">
        <USelect
          v-model="release"
          :items="releaseItems"
          class="w-full"
        />
      </UFormField>
    </template>

    <ToolActions>
      <UButton
        color="primary"
        :loading="status === 'processing'"
        @click="execute"
      >
        Run
      </UButton>
      <UButton
        :label="copyLabel()"
        :icon="copyIcon()"
        :color="copyColor()"
        variant="ghost"
        :disabled="!output"
        @click="handleCopy"
      />
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

    <ToolEditor
      v-if="output"
      :model-value="output"
      label="Result"
      readonly
      :rows="6"
    />

    <template #docs>
      <DataToolDocs title="About semver">
        <p class="text-sm leading-relaxed text-muted">
          Semver ranges like ^1.2.0 and ~1.2.0 are common in npm package.json files.
        </p>
        <DataRelatedTools
          :items="[
            { label: 'Cron Visualizer', to: '/hub/dev/cron' },
            { label: 'Hash Generator', to: '/hub/crypto/hash-generator' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
