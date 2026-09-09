<script setup lang="ts">
import type { GlobFlavor } from '#shared/utils/dev/glob-matcher'
import { evaluateGlobRules, GLOB_FLAVORS } from '#shared/utils/dev/glob-matcher'

useToolSeo('glob-tester')

const flavor = useToolOption<GlobFlavor>('flavor', 'standard')

const patternText = ref(
  ['src/**/*.ts', 'src/**/*.vue', '!src/**/*.test.ts'].join('\n'),
)

const testPaths = ref<string>(
  [
    'src/index.ts',
    'src/utils/math.ts',
    'src/utils/math.test.ts',
    'src/components/Header.vue',
    'tests/unit/app.test.ts',
    'dist/bundle.js',
    'logs/debug.log',
    'package.json',
    'docs/README.md',
  ].join('\n'),
)

const presets = [
  { label: 'Sources without tests', patterns: ['src/**/*.ts', 'src/**/*.vue', '!src/**/*.test.ts'] },
  { label: 'All TypeScript without tests', patterns: ['**/*.ts', '!**/*.test.ts'] },
  { label: 'Configs and docs', patterns: ['**/*.{json,md}'] },
  { label: 'gitignore block', patterns: ['# build output', 'dist/', '*.log'] },
]

function toLines(text: string) {
  return text.split('\n').map(line => line.trim()).filter(Boolean)
}

const patternList = computed(() => toLines(patternText.value))
const pathList = computed(() => toLines(testPaths.value))

const decisions = computed(() => evaluateGlobRules(patternList.value, pathList.value, flavor.value))

useLiveTool(decisions, { runLocation: 'browser', option: () => flavor.value })

const includedCount = computed(() => decisions.value.filter(item => item.included).length)

function applyPreset(patterns: string[]) {
  patternText.value = patterns.join('\n')
}
</script>

<template>
  <ToolPage>
    <div class="space-y-6">
      <div class="space-y-3">
        <div class="flex flex-wrap gap-4">
          <UFormField
            label="Matcher flavor"
            help="Each flavor reads the same pattern with different rules."
          >
            <USelect
              v-model="flavor"
              :items="GLOB_FLAVORS"
              class="w-52"
            />
          </UFormField>
        </div>

        <UFormField
          label="Patterns (one per line, in order)"
          help="The last pattern that matches decides the result. A leading ! excludes a path."
        >
          <UTextarea
            v-model="patternText"
            :rows="4"
            placeholder="src/**/*.ts&#10;!src/**/*.test.ts"
            class="w-full font-mono text-sm"
          />
        </UFormField>

        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-muted font-medium mr-1">Presets:</span>
          <UButton
            v-for="preset in presets"
            :key="preset.label"
            size="xs"
            variant="soft"
            color="neutral"
            :label="preset.label"
            @click="applyPreset(preset.patterns)"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LazyToolEditor
          v-model="testPaths"
          hydrate-on-idle
          label="Test Paths (one per line)"
          placeholder="Enter file paths..."
        />

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-muted block">Match Results</span>
            <span class="text-xs font-mono text-muted">
              {{ includedCount }} of {{ decisions.length }} included
            </span>
          </div>

          <div
            aria-label="Match results"
            class="border border-default rounded-xl bg-default overflow-hidden max-h-[300px] overflow-y-auto divide-y divide-default font-mono text-xs"
          >
            <div
              v-for="(item, index) in decisions"
              :key="index"
              class="flex items-start justify-between gap-3 px-3 py-2"
              :class="item.included ? 'bg-success/10' : 'bg-elevated'"
            >
              <div class="min-w-0">
                <p
                  class="truncate"
                  :class="item.included ? 'text-success font-medium' : 'text-muted'"
                >
                  {{ item.path }}
                </p>
                <p class="mt-0.5 truncate text-muted">
                  {{ item.decidedBy ? `Rule ${item.ruleIndex + 1}: ${item.decidedBy}` : 'No rule matched' }}
                </p>
              </div>
              <UBadge
                :label="item.included ? 'Included' : 'Excluded'"
                size="xs"
                :color="item.included ? 'success' : 'neutral'"
                variant="subtle"
                class="shrink-0"
              />
            </div>
            <div
              v-if="decisions.length === 0"
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
            A glob pattern selects files by name. This tool tests an ordered list of patterns
            against a list of paths. Each result row shows the rule that decided the result, so you
            can correct a rule before you use it.
          </p>

          <h3 class="text-base font-semibold text-highlighted">
            Pattern syntax
          </h3>
          <ul class="list-disc pl-5 space-y-1">
            <li><code>*</code> matches any characters in one folder segment.</li>
            <li><code>**</code> matches across folders at any depth.</li>
            <li><code>?</code> matches one character.</li>
            <li><code>{a,b}</code> matches any of the comma-separated options.</li>
            <li><code>[a-z]</code> matches one character in the range. <code>[!a-z]</code> matches one character outside the range.</li>
            <li><code>!pattern</code> excludes a path.</li>
          </ul>

          <h3 class="text-base font-semibold text-highlighted">
            Rule order
          </h3>
          <p>
            The tool reads the patterns from the top down and keeps your order. The last pattern
            that matches decides the result. A path that no pattern matches is excluded. The tool
            does not move an exclude rule ahead of an include rule, so a <code>!</code> rule on the
            first line has no effect on a path that a later rule includes.
          </p>

          <h3 class="text-base font-semibold text-highlighted">
            Flavor differences
          </h3>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead>
                <tr class="border-b border-default text-highlighted">
                  <th class="py-2 pr-4 font-semibold">
                    Flavor
                  </th>
                  <th class="py-2 font-semibold">
                    Rules
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-b border-default align-top">
                  <td class="py-2 pr-4">
                    Standard glob
                  </td>
                  <td class="py-2">
                    The pattern must match the full path. <code>*</code> and <code>?</code> stop at
                    a folder separator. <code>**</code> crosses folders. <code>{a,b}</code> and
                    <code>+(a|b)</code> expand. A pattern must start with a dot to match a dot file.
                  </td>
                </tr>
                <tr class="border-b border-default align-top">
                  <td class="py-2 pr-4">
                    .gitignore
                  </td>
                  <td class="py-2">
                    A pattern with no slash matches at any depth. A leading <code>/</code> anchors
                    the pattern to the root. A trailing <code>/</code> matches a directory only. A
                    rule on a folder also selects the content of the folder. A line that starts with
                    <code>#</code> is a comment. Git expands no braces and no extglobs, so
                    <code>{a,b}</code> is literal text. A dot file is a normal name.
                  </td>
                </tr>
                <tr class="align-top">
                  <td class="py-2 pr-4">
                    minimatch
                  </td>
                  <td class="py-2">
                    The same syntax as the standard flavor. minimatch is the matcher in ESLint, npm,
                    and Prettier. It reads the same patterns as picomatch, the engine of this tool.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 class="text-base font-semibold text-highlighted">
            Limits
          </h3>
          <ul class="list-disc pl-5 space-y-1">
            <li>
              The tool has no filesystem. It reads your paths as text. A path that ends with
              <code>/</code> is a directory. For any other path the tool cannot know the type, so a
              directory-only rule such as <code>build/</code> does not match it.
            </li>
            <li>
              The tool tests one list of rules. It does not read a nested <code>.gitignore</code>
              file and it applies no file precedence. The result is close to git, but it is not full
              <code>.gitignore</code> parity.
            </li>
            <li>
              The engine is picomatch with the POSIX separator. Another operating system, shell, or
              library can give a different result for the same pattern.
            </li>
            <li>
              The minimatch flavor uses the same engine. Two differences are known: this tool
              matches the bare folder <code>a</code> against <code>a/**</code> and minimatch does
              not. This tool matches <code>a//b</code> against <code>a/*/b</code> and minimatch does
              not.
            </li>
          </ul>
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
