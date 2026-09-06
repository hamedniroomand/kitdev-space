<script setup lang="ts">
import type { SemverAction, SemverRelease } from '#shared/utils/dev/semver'
import { canSemverInBrowser, semverBump } from '#shared/utils/dev/semver'

const action = ref<SemverAction>('satisfies')
const version = ref('1.2.3')
const range = ref('^1.0.0')
const versionsText = ref('1.10.0\n1.2.0\n1.9.0')
const release = ref<SemverRelease>('patch')
const output = ref('')
const { status, error, run, reset } = useTool<string>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

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

async function execute() {
  output.value = ''
  await run(async () => {
    if (canSemverInBrowser(action.value)) {
      const text = semverBump(version.value, release.value)
      output.value = text
      return text
    }

    const body: Record<string, unknown> = { action: action.value }
    if (action.value === 'satisfies') {
      body.version = version.value
      body.range = range.value
    } else {
      body.versions = versionsText.value
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
  }, 'The semver operation failed.')
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
    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-shield-check"
      title="Where the work runs"
      description="A bump runs in your browser. Satisfies and sort go to the server, because they read the full range grammar."
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
      <ToolDocs title="About semver">
        <p class="text-sm leading-relaxed text-muted">
          Semver ranges like ^1.2.0 and ~1.2.0 are common in npm package.json files.
        </p>
        <RelatedTools
          :items="[
            { label: 'Cron Visualizer', to: '/hub/dev/cron' },
            { label: 'Hash Generator', to: '/hub/crypto/hash-generator' }
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
