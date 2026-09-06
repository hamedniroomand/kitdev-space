<script setup lang="ts">
import type { RegexTestResult } from '#shared/utils/dev/regex'
import { testRegex } from '#shared/utils/dev/regex'

const pattern = ref('\\b(?<word>[A-Z][a-z]+)\\b')
const sample = ref('Hello world. KitDev Space helps builders ship tools.')
const flags = ref({
  g: true,
  i: false,
  m: false,
  s: false,
  u: false,
  y: false,
})

useToolSeo('regex-tester')

const flagString = computed(() => {
  return (Object.keys(flags.value) as Array<keyof typeof flags.value>)
    .filter(key => flags.value[key])
    .join('')
})

const result = computed<RegexTestResult>(() => testRegex(pattern.value, sample.value, flagString.value))

const flagItems = [
  { key: 'g' as const, label: 'g', hint: 'Global' },
  { key: 'i' as const, label: 'i', hint: 'Ignore case' },
  { key: 'm' as const, label: 'm', hint: 'Multiline' },
  { key: 's' as const, label: 's', hint: 'DotAll' },
  { key: 'u' as const, label: 'u', hint: 'Unicode' },
  { key: 'y' as const, label: 'y', hint: 'Sticky' },
]

function handleClear() {
  pattern.value = ''
  sample.value = ''
}
</script>

<template>
  <ToolPage>
    <UAlert
      color="neutral"
      variant="subtle"
      title="Processed locally"
      description="This tool runs in the browser with the JavaScript RegExp engine."
    />

    <UFormField label="Pattern">
      <UInput
        v-model="pattern"
        placeholder="Enter a regular expression"
        class="w-full"
        :ui="{ base: 'font-mono' }"
      />
    </UFormField>

    <div class="flex flex-wrap gap-3">
      <UFormField
        v-for="item in flagItems"
        :key="item.key"
        :label="item.label"
        :hint="item.hint"
      >
        <USwitch v-model="flags[item.key]" />
      </UFormField>
    </div>

    <LazyToolEditor
      v-model="sample"
      hydrate-on-idle
      label="Sample text"
      placeholder="Paste text to test against the pattern"
      :rows="8"
    />

    <ToolActions>
      <UButton
        label="Clear"
        color="neutral"
        variant="ghost"
        icon="i-lucide-eraser"
        @click="handleClear"
      />
    </ToolActions>

    <ToolError
      v-if="result.error"
      :message="result.error"
    />

    <div
      v-else
      class="space-y-6"
    >
      <section class="space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-sm font-medium text-highlighted">
            Matches
          </h2>
          <UBadge
            color="neutral"
            variant="subtle"
          >
            {{ result.matches.length }}
          </UBadge>
          <p class="font-mono text-xs text-muted">
            /{{ result.pattern }}/{{ result.flags }}
          </p>
        </div>

        <div class="min-h-24 whitespace-pre-wrap break-words rounded-md border border-default p-3 font-mono text-sm leading-relaxed text-highlighted">
          <template
            v-for="(segment, index) in result.highlights"
            :key="`${index}-${segment.matchIndex}`"
          >
            <mark
              v-if="segment.matched"
              class="rounded-sm bg-success/20 px-0.5 text-highlighted"
              :title="`Match ${Number(segment.matchIndex) + 1}`"
            >{{ segment.text }}</mark>
            <span v-else>{{ segment.text }}</span>
          </template>
          <span
            v-if="!sample"
            class="text-muted"
          >Sample text appears here.</span>
        </div>
      </section>

      <section
        v-if="result.matches.length"
        class="space-y-3"
      >
        <h2 class="text-sm font-medium text-highlighted">
          Capture groups
        </h2>
        <ul class="space-y-3">
          <li
            v-for="match in result.matches"
            :key="match.index"
            class="rounded-md border border-default p-3"
          >
            <p class="font-mono text-sm text-highlighted">
              Match {{ match.index + 1 }} · {{ match.start }}–{{ match.end }} · {{ match.match }}
            </p>
            <ul
              v-if="match.groups.length"
              class="mt-2 space-y-1"
            >
              <li
                v-for="group in match.groups"
                :key="`${match.index}-${group.index}-${group.name || 'g'}`"
                class="font-mono text-xs text-muted"
              >
                #{{ group.index }}
                <span v-if="group.name"> ({{ group.name }})</span>
                :
                <span class="text-highlighted">{{ group.value ?? 'undefined' }}</span>
                <span v-if="group.start !== null && group.end !== null">
                  · {{ group.start }}–{{ group.end }}
                </span>
              </li>
            </ul>
            <p
              v-else
              class="mt-2 text-sm text-muted"
            >
              No capture groups.
            </p>
          </li>
        </ul>
      </section>

      <section class="space-y-3">
        <h2 class="text-sm font-medium text-highlighted">
          Token explanation
        </h2>
        <ul
          v-if="result.explanations.length"
          class="divide-y divide-default rounded-md border border-default"
        >
          <li
            v-for="(item, index) in result.explanations"
            :key="`${item.index}-${index}`"
            class="flex flex-wrap gap-3 px-3 py-2 text-sm"
          >
            <code class="font-mono text-highlighted">{{ item.token }}</code>
            <span class="text-muted">{{ item.meaning }}</span>
          </li>
        </ul>
        <p
          v-else
          class="text-sm text-muted"
        >
          Enter a pattern to see token explanations.
        </p>
      </section>
    </div>

    <template #docs>
      <ToolDocs title="About the RegEx tester">
        <div class="space-y-4 text-muted">
          <p>
            This tool tests a regular expression against sample text in the browser.
          </p>
          <p>
            Matches are highlighted in the sample. Capture groups list names and indices when present.
          </p>
          <p>
            The explainer describes common tokens such as classes, quantifiers, and lookarounds.
          </p>
          <p>
            This tool does not store your input.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Text Diff', to: '/hub/data/text-diff' },
            { label: 'Encoder & Escaper', to: '/hub/dev/encoder' },
            { label: 'Case and Slug Converter', to: '/hub/dev/case-converter' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
