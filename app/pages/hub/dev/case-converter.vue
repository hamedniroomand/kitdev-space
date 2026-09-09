<script setup lang="ts">
import {
  convertLines,
  toCamelCase,
  toConstantCase,
  toKebabCase,
  toPascalCase,
  toSlug,
  toSnakeCase,
} from '#shared/utils/dev/case'

const input = ref('hello world developer')
const lineMode = useToolOption('line-mode', false)
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

useToolSeo('case-converter')

const conversions = computed(() => {
  const text = input.value
  const apply = (convert: (line: string) => string) =>
    lineMode.value ? convertLines(text, convert) : convert(text)

  return [
    { label: 'camelCase', value: apply(toCamelCase), id: 'camel' },
    { label: 'PascalCase', value: apply(toPascalCase), id: 'pascal' },
    { label: 'snake_case', value: apply(toSnakeCase), id: 'snake' },
    { label: 'kebab-case', value: apply(toKebabCase), id: 'kebab' },
    { label: 'URL slug', value: apply(toSlug), id: 'slug' },
    { label: 'CONSTANT_CASE', value: apply(toConstantCase), id: 'constant' },
  ]
})
useLiveTool(conversions, {
  runLocation: 'browser',
  option: () => (lineMode.value ? 'independent-lines' : 'whole-text'),
})

async function copyAll() {
  // A line-mode value is multiline, so it needs its own block under the label.
  const summary = conversions.value
    .map(c => (lineMode.value ? `${c.label}:\n${c.value}` : `${c.label}: ${c.value}`))
    .join('\n')
  await copy(summary, 'all')
}

function handleClear() {
  input.value = ''
}
</script>

<template>
  <ToolPage>
    <UAlert
      color="neutral"
      variant="subtle"
      title="Processed locally"
      description="This tool runs in the browser."
    />

    <LazyToolEditor
      v-model="input"
      hydrate-on-idle
      label="Input Text"
      placeholder="Type or paste text here"
    />

    <ToolActions>
      <div class="flex items-center gap-1.5">
        <USwitch
          v-model="lineMode"
          aria-label="Independent lines"
          size="xs"
        />
        <span class="text-xs text-muted">Independent lines</span>
      </div>
      <UButton
        :label="copyLabel('all', 'Copy All')"
        :color="copyColor('all')"
        variant="subtle"
        :icon="copyIcon('all')"
        :disabled="!input"
        @click="copyAll"
      />
      <UButton
        label="Clear"
        color="neutral"
        variant="ghost"
        icon="i-lucide-eraser"
        @click="handleClear"
      />
    </ToolActions>

    <div class="space-y-3">
      <ToolResultRow
        v-for="item in conversions"
        :key="item.id"
        :label="item.label"
        :value="item.value"
      >
        <p class="mt-1 font-mono text-sm break-all whitespace-pre-wrap text-highlighted">
          {{ item.value || '—' }}
        </p>
      </ToolResultRow>
    </div>

    <template #docs>
      <ToolDocs title="About Text Case and Slugs">
        <div class="space-y-4 text-muted">
          <p>
            Programming languages use different naming styles for variables, functions, and files.
          </p>
          <p>
            Use camelCase and PascalCase for JavaScript and TypeScript identifiers.
          </p>
          <p>
            Use snake_case for Python identifiers and database columns.
          </p>
          <p>
            Use kebab-case and URL slugs for web paths, filenames, and CSS class names.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'JSON Formatter', to: '/hub/data/json-formatter' },
            { label: 'ID & Secret Generator', to: '/hub/crypto/generator' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
