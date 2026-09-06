<script setup lang="ts">
import {
  toCamelCase,
  toConstantCase,
  toKebabCase,
  toPascalCase,
  toSlug,
  toSnakeCase
} from '#shared/utils/dev/case'

const input = ref('hello world developer')
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

useToolSeo('case-converter')

const conversions = computed(() => {
  const text = input.value
  return [
    { label: 'camelCase', value: toCamelCase(text), id: 'camel' },
    { label: 'PascalCase', value: toPascalCase(text), id: 'pascal' },
    { label: 'snake_case', value: toSnakeCase(text), id: 'snake' },
    { label: 'kebab-case', value: toKebabCase(text), id: 'kebab' },
    { label: 'URL slug', value: toSlug(text), id: 'slug' },
    { label: 'CONSTANT_CASE', value: toConstantCase(text), id: 'constant' }
  ]
})

async function copyItem(val: string, id: string) {
  if (!val) {
    return
  }
  await copy(val, id)
}

async function copyAll() {
  const summary = conversions.value
    .map(c => `${c.label}: ${c.value}`)
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

    <ToolEditor
      v-model="input"
      label="Input Text"
      placeholder="Type or paste text here"
    />

    <ToolActions>
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
      <div
        v-for="item in conversions"
        :key="item.id"
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[12px] border border-default bg-elevated p-4"
      >
        <div class="min-w-0 flex-1">
          <p class="font-mono text-xs font-medium text-muted uppercase">
            {{ item.label }}
          </p>
          <p class="mt-1 font-mono text-sm break-all text-highlighted">
            {{ item.value || '—' }}
          </p>
        </div>
        <UButton
          :label="copyLabel(item.id)"
          size="xs"
          :color="copyColor(item.id)"
          variant="subtle"
          :icon="copyIcon(item.id)"
          :disabled="!item.value"
          @click="copyItem(item.value, item.id)"
        />
      </div>
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
            { label: 'ID & Secret Generator', to: '/hub/crypto/generator' }
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
