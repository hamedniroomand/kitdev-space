<script setup lang="ts">
import type { SemverAction, SemverMatch, SemverMatrix, SemverRelease } from '#shared/utils/dev/semver'
import {
  explainSemverRange,
  semverBump,
  semverMatchList,
  semverMatrix,
  semverSort,
} from '#shared/utils/dev/semver'

type SemverResult
  = | { kind: 'text', text: string }
    | { kind: 'satisfies', expanded: string, matches: SemverMatch[] }
    | { kind: 'matrix', expanded: string[], data: SemverMatrix }

const action = ref<SemverAction>('satisfies')
const version = ref('1.2.3')
const range = ref('^1.0.0')
const versionsText = ref('1.10.0\n1.2.0\n1.9.0\n2.0.0\n1.5.0-rc.1')
const rangesText = ref('^1.0.0\n~1.2.0\n>=1.5.0 <2.0.0')
const release = ref<SemverRelease>('patch')
const identifier = ref('')
const includePrerelease = useToolOption<boolean>('include-prerelease', false)
const { status, error, result, run, reset } = useTool<SemverResult>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

const actionItems = [
  { label: 'Satisfies range', value: 'satisfies' },
  { label: 'Sort versions', value: 'sort' },
  { label: 'Bump version', value: 'bump' },
  { label: 'Compatibility matrix', value: 'matrix' },
]

const releaseItems = [
  { label: 'Patch', value: 'patch' },
  { label: 'Minor', value: 'minor' },
  { label: 'Major', value: 'major' },
  { label: 'Prerelease', value: 'prerelease' },
]

const showPrereleaseToggle = computed(() => action.value === 'satisfies' || action.value === 'matrix')

const versionList = computed(() => versionsText.value.split('\n'))
const rangeList = computed(() => rangesText.value.split('\n'))

useToolSeo('semver')

function matchLabel(match: SemverMatch): string {
  if (!match.valid) {
    return 'Invalid version'
  }
  return match.matches ? 'Match' : 'No match'
}

function cellLabel(rowVersion: string, columnRange: string, matches: boolean): string {
  return `${rowVersion} ${matches ? 'matches' : 'does not match'} ${columnRange}`
}

function resultText(value: SemverResult): string {
  if (value.kind === 'text') {
    return value.text
  }
  if (value.kind === 'satisfies') {
    const rows = value.matches.map(match => `${match.version}\t${matchLabel(match)}`)
    return [value.expanded, ...rows].join('\n')
  }
  const header = ['version', ...value.data.ranges].join('\t')
  const rows = value.data.rows.map(row =>
    [row.version, ...row.cells.map(cell => (cell ? 'match' : 'no match'))].join('\t'),
  )
  return [header, ...rows].join('\n')
}

function calculate(): SemverResult {
  const options = { includePrerelease: includePrerelease.value }
  if (action.value === 'bump') {
    return { kind: 'text', text: semverBump(version.value, release.value, identifier.value) }
  }
  if (action.value === 'sort') {
    return { kind: 'text', text: semverSort(versionList.value).join('\n') }
  }
  if (action.value === 'satisfies') {
    return {
      kind: 'satisfies',
      expanded: explainSemverRange(range.value),
      matches: semverMatchList(versionList.value, range.value, options),
    }
  }
  const data = semverMatrix(versionList.value, rangeList.value, options)
  return { kind: 'matrix', expanded: data.ranges.map(explainSemverRange), data }
}

async function execute() {
  reset()
  await run(calculate, 'The semver operation failed.', { option: action.value })
}

async function handleCopy() {
  if (!result.value) {
    return
  }
  await copy(resultText(result.value))
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
      <UFormField label="Range">
        <UInput
          v-model="range"
          placeholder="^1.0.0"
        />
      </UFormField>
      <LazyToolEditor
        v-model="versionsText"
        hydrate-on-idle
        label="Versions (one per line)"
        :rows="8"
      />
    </template>

    <LazyToolEditor
      v-else-if="action === 'sort'"
      v-model="versionsText"
      hydrate-on-idle
      label="Versions (one per line)"
      :rows="8"
    />

    <div
      v-else-if="action === 'matrix'"
      class="grid gap-4 md:grid-cols-2"
    >
      <LazyToolEditor
        v-model="versionsText"
        hydrate-on-idle
        label="Versions (one per line)"
        :rows="8"
      />
      <LazyToolEditor
        v-model="rangesText"
        hydrate-on-idle
        label="Ranges (one per line)"
        :rows="8"
      />
    </div>

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
      <UFormField
        v-if="release === 'prerelease'"
        label="Prerelease identifier"
        description="Leave it empty to keep the identifier of the version."
      >
        <UInput
          v-model="identifier"
          placeholder="beta"
        />
      </UFormField>
    </template>

    <USwitch
      v-if="showPrereleaseToggle"
      v-model="includePrerelease"
      label="Include prerelease versions"
    />

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
        :disabled="!result"
        @click="handleCopy"
      />
      <UButton
        color="neutral"
        variant="ghost"
        @click="reset"
      >
        Clear
      </UButton>
    </ToolActions>

    <ToolError
      v-if="error"
      :message="error"
    />

    <template v-if="result?.kind === 'satisfies'">
      <ToolResultRow
        label="Expanded range"
        :value="result.expanded"
        description="The same range as comparison operators"
      />
      <div
        aria-label="Version matches"
        class="divide-y divide-default overflow-hidden rounded-md border border-default font-mono text-sm"
      >
        <div
          v-for="(match, index) in result.matches"
          :key="index"
          class="flex items-center justify-between gap-3 px-3 py-2"
          :class="match.matches ? 'bg-success/10 text-success' : 'text-muted'"
        >
          <span class="truncate">{{ match.version }}</span>
          <UBadge
            :label="matchLabel(match)"
            size="xs"
            variant="subtle"
            :color="match.matches ? 'success' : match.valid ? 'neutral' : 'warning'"
          />
        </div>
      </div>
    </template>

    <div
      v-else-if="result?.kind === 'matrix'"
      class="overflow-x-auto rounded-md border border-default"
    >
      <table class="w-full text-left text-sm">
        <caption class="sr-only">
          Which version satisfies which range
        </caption>
        <thead class="bg-elevated/60 text-xs text-muted">
          <tr>
            <th
              scope="col"
              class="px-3 py-2 font-medium"
            >
              Version
            </th>
            <th
              v-for="(rangeItem, index) in result.data.ranges"
              :key="index"
              scope="col"
              class="px-3 py-2 font-medium"
            >
              <span class="font-mono text-highlighted">{{ rangeItem }}</span>
              <span class="mt-0.5 block font-mono text-[10px] text-muted">{{ result.expanded[index] }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, rowIndex) in result.data.rows"
            :key="rowIndex"
            class="border-t border-default"
          >
            <th
              scope="row"
              class="px-3 py-2 text-left font-mono font-medium"
              :class="row.valid ? 'text-highlighted' : 'text-warning'"
            >
              {{ row.version }}
            </th>
            <td
              v-for="(cell, index) in row.cells"
              :key="index"
              class="px-3 py-2"
            >
              <span :class="cell ? 'text-success' : 'text-muted'">
                <UIcon
                  :name="cell ? 'i-lucide-check' : 'i-lucide-x'"
                  class="size-4 align-middle"
                />
                <span class="sr-only">{{ cellLabel(row.version, result.data.ranges[index] ?? '', cell) }}</span>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <LazyToolEditor
      v-else-if="result"
      hydrate-on-idle
      :model-value="resultText(result)"
      label="Result"
      readonly
      :rows="6"
    />

    <template #docs>
      <ToolDocs title="About semver">
        <div class="space-y-4 text-sm leading-relaxed text-muted">
          <p>
            A range in a package.json file is a set of comparisons. This tool shows the comparisons,
            so you can read the limits of the range:
          </p>
          <ul class="list-disc space-y-1 pl-5">
            <li><code>^1.2.3</code> is <code>&gt;=1.2.3 &lt;2.0.0</code>. It holds the major number.</li>
            <li><code>~1.2.3</code> is <code>&gt;=1.2.3 &lt;1.3.0</code>. It holds the minor number.</li>
            <li><code>1.2.3 - 2.3.4</code> is <code>&gt;=1.2.3 &lt;=2.3.4</code>.</li>
            <li><code>1.x</code> is <code>&gt;=1.0.0 &lt;2.0.0</code>.</li>
          </ul>
          <p>
            A prerelease version such as <code>1.5.0-rc.1</code> does not satisfy <code>^1.0.0</code>.
            Use the include prerelease option to accept it.
          </p>
          <p>
            The prerelease bump adds one to the last number of the tag, so
            <code>1.2.3-beta.1</code> becomes <code>1.2.3-beta.2</code>. A prerelease bump of a
            release version also increases the patch number, so <code>1.2.3</code> with the
            identifier <code>beta</code> becomes <code>1.2.4-beta.0</code>.
          </p>
          <p>
            The compatibility matrix tests every version against every range. Use it to select one
            range that accepts all the versions that you support.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Cron Visualizer', to: '/hub/dev/cron' },
            { label: 'Hash Generator', to: '/hub/crypto/hash-generator' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
