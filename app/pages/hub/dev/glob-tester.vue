<script setup lang="ts">
import { testGlobMatch } from '#shared/utils/dev/glob-matcher'

useToolSeo('glob-tester')

const globPattern = ref('src/**/*.vue')
const testPaths = ref<string>(
  [
    'src/components/Header.vue',
    'src/components/Footer.vue',
    'src/Button.vue',
    'src/utils/math.ts',
    'tests/unit/app.test.ts',
    'package.json',
    'docs/README.md',
  ].join('\n'),
)

const pathList = computed(() => {
  return testPaths.value
    .split('\n')
    .map(p => p.trim())
    .filter(Boolean)
})

const evaluatedResults = computed(() => {
  const pattern = globPattern.value.trim()
  return pathList.value.map(path => ({
    path,
    matches: testGlobMatch(pattern, path),
  }))
})
useLiveTool(evaluatedResults)

const matchedCount = computed(() => evaluatedResults.value.filter(r => r.matches).length)
const totalCount = computed(() => evaluatedResults.value.length)

function applyPreset(pattern: string) {
  globPattern.value = pattern
}
</script>

<template>
  <ToolPage>
    <div class="space-y-6">
      <!-- Top controls -->
      <div class="space-y-3">
        <UFormField label="Glob Pattern">
          <UInput
            v-model="globPattern"
            placeholder="e.g. src/**/*.vue or *.ts"
            size="lg"
            class="font-mono text-sm"
          />
        </UFormField>

        <!-- Presets -->
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-muted font-medium mr-1">Presets:</span>
          <UButton
            size="xs"
            variant="soft"
            color="neutral"
            label="*.ts (TypeScript files)"
            @click="applyPreset('*.ts')"
          />
          <UButton
            size="xs"
            variant="soft"
            color="neutral"
            label="src/**/*.vue (Components)"
            @click="applyPreset('src/**/*.vue')"
          />
          <UButton
            size="xs"
            variant="soft"
            color="neutral"
            label="!tests/** (Exclude tests)"
            @click="applyPreset('!tests/**')"
          />
          <UButton
            size="xs"
            variant="soft"
            color="neutral"
            label="**/*.{json,md} (Configs and Docs)"
            @click="applyPreset('**/*.{json,md}')"
          />
        </div>
      </div>

      <!-- Split View -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Input file paths -->
        <LazyToolEditor
          v-model="testPaths"
          hydrate-on-idle
          label="Test Paths (one per line)"
          placeholder="Enter file paths..."
        />

        <!-- Evaluation results -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-muted block">Match Results</span>
            <span class="text-xs font-mono text-muted">
              {{ matchedCount }} / {{ totalCount }} matched
            </span>
          </div>

          <div
            aria-label="Match results"
            class="border border-default rounded-xl bg-default overflow-hidden max-h-[300px] overflow-y-auto divide-y divide-default font-mono text-xs"
          >
            <div
              v-for="(item, index) in evaluatedResults"
              :key="index"
              class="flex items-center justify-between px-3 py-2 transition-colors"
              :class="item.matches ? 'bg-success/10' : 'bg-transparent text-muted'"
            >
              <span
                class="truncate"
                :class="item.matches ? 'text-success font-medium' : ''"
              >
                {{ item.path }}
              </span>
              <UBadge
                :label="item.matches ? 'Match' : 'No match'"
                size="xs"
                :color="item.matches ? 'success' : 'neutral'"
                variant="subtle"
              />
            </div>
            <div
              v-if="evaluatedResults.length === 0"
              class="p-4 text-center text-xs text-muted"
            >
              Enter file paths to test matches.
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #docs>
      <ToolDocs title="About glob patterns">
        <div class="space-y-4 text-muted">
          <p>
            A glob pattern selects files by name. This tool tests a pattern against a list of paths and shows which paths match, so you can correct the pattern before you use it.
          </p>
          <p>
            Supported rules:
          </p>
          <ul class="list-disc pl-5 space-y-1">
            <li><code>*</code> matches any characters in one folder segment.</li>
            <li><code>**</code> matches across folders at any depth.</li>
            <li><code>?</code> matches one character.</li>
            <li><code>{a,b}</code> matches any of the comma-separated options.</li>
            <li><code>!pattern</code> negates the match to exclude paths.</li>
          </ul>
          <p>
            Use it to check a .gitignore rule, a test file pattern, a build include list, or a CI path filter.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Regex Tester', to: '/hub/dev/regex-tester' },
            { label: 'Chmod Calculator', to: '/hub/dev/chmod' },
            { label: 'Tar Explorer', to: '/hub/dev/tar' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
