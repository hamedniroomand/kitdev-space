<script setup lang="ts">
import type { SemverAction, SemverRelease } from '#shared/utils/dev/semver'
import { semverBump, semverSatisfies, semverSort } from '#shared/utils/dev/semver'

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
  { label: 'Bump version', value: 'bump' },
]

const releaseItems = [
  { label: 'Patch', value: 'patch' },
  { label: 'Minor', value: 'minor' },
  { label: 'Major', value: 'major' },
]

useToolSeo('semver')

async function execute() {
  output.value = ''
  await run(() => {
    let text = ''
    if (action.value === 'bump') {
      text = semverBump(version.value, release.value)
    }
    else if (action.value === 'satisfies') {
      const ok = semverSatisfies(version.value, range.value)
      text = ok
        ? 'true — version satisfies range'
        : 'false — version does not satisfy range'
    }
    else if (action.value === 'sort') {
      const list = versionsText.value.split('\n')
      text = semverSort(list).join('\n')
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

useToolShortcuts({
  onRun: () => execute(),
  onCopy: () => handleCopy(),
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

    <LazyToolEditor
      v-else-if="action === 'sort'"
      v-model="versionsText"
      hydrate-on-idle
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

    <LazyToolEditor
      v-if="output"
      hydrate-on-idle
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
            { label: 'Hash Generator', to: '/hub/crypto/hash-generator' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
