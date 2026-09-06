<script setup lang="ts">
import { testGlobMatch } from '#shared/utils/dev/glob-matcher'

const globPattern = ref('src/**/*.vue')
const testPaths = ref<string>(
  [
    'src/components/Header.vue',
    'src/components/Footer.vue',
    'src/Button.vue',
    'src/utils/math.ts',
    'tests/unit/app.test.ts',
    'package.json',
    'docs/README.md'
  ].join('\n')
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
    matches: testGlobMatch(pattern, path)
  }))
})

const matchedCount = computed(() => evaluatedResults.value.filter(r => r.matches).length)
const totalCount = computed(() => evaluatedResults.value.length)

function applyPreset(pattern: string) {
  globPattern.value = pattern
}

useSeoMeta({
  title: 'Glob Tester — KitDev Space',
  description: 'Test and debug glob matching patterns against file paths in real-time.'
})
</script>

<template>
  <ToolPage
    title="Glob Tester"
    description="Test glob patterns against a list of file paths in real-time."
  >
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
            @click="applyPreset('**/*.json')"
          />
        </div>
      </div>

      <!-- Split View -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Input file paths -->
        <div class="space-y-2">
          <label class="text-xs font-medium text-muted block">Test Paths (one per line)</label>
          <textarea
            v-model="testPaths"
            rows="12"
            placeholder="Enter file paths..."
            class="w-full p-3 font-mono text-xs bg-default border border-default rounded-xl text-highlighted resize-y focus:outline-none focus:border-primary"
          />
        </div>

        <!-- Evaluation results -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-xs font-medium text-muted block">Match Results</label>
            <span class="text-xs font-mono text-muted">
              {{ matchedCount }} / {{ totalCount }} matched
            </span>
          </div>

          <div class="border border-default rounded-xl bg-default overflow-hidden max-h-[300px] overflow-y-auto divide-y divide-default font-mono text-xs">
            <div
              v-for="(item, index) in evaluatedResults"
              :key="index"
              class="flex items-center justify-between px-3 py-2 transition-colors"
              :class="item.matches ? 'bg-green-50/50 dark:bg-green-950/20' : 'bg-transparent text-muted'"
            >
              <span
                class="truncate"
                :class="item.matches ? 'text-green-700 dark:text-green-300 font-medium' : ''"
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
  </ToolPage>
</template>
