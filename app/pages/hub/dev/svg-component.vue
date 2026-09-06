<script setup lang="ts">
import { svgToComponent, type SvgComponentTarget } from '#shared/utils/dev/svg-component'

const input = ref(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"/>
  <path d="M8 12h8"/>
</svg>`)
const output = ref('')
const target = ref<SvgComponentTarget>('react')
const { status, error, result, run, reset } = useTool<string>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const { downloadText } = useDownload()

const targetItems = [
  { label: 'React (JSX)', value: 'react' },
  { label: 'Vue 3', value: 'vue' }
]

useToolSeo('svg-component')

const outputLang = computed(() => (target.value === 'vue' ? 'html' : 'jsx'))

async function convert() {
  await run(() => svgToComponent(input.value, target.value))
  if (status.value === 'success' && result.value !== null) {
    output.value = result.value
  }
}

async function handleCopy() {
  if (!output.value) {
    return
  }
  await copy(output.value)
}

function handleDownload() {
  if (!output.value) {
    return
  }
  const filename = target.value === 'vue' ? 'Icon.vue' : 'SvgIcon.jsx'
  const mime = target.value === 'vue' ? 'text/plain' : 'text/javascript'
  downloadText(filename, output.value, mime)
}

function handleClear() {
  input.value = ''
  output.value = ''
  reset()
}

defineShortcuts({
  meta_enter: {
    usingInput: true,
    handler: () => {
      convert()
    }
  }
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

    <ToolEditor
      v-model="input"
      label="SVG input"
      placeholder="Paste SVG code here"
      lang="svg"
    />

    <UFormField label="Target">
      <USelect
        v-model="target"
        :items="targetItems"
        class="w-48"
      />
    </UFormField>

    <ToolActions>
      <UButton
        label="Convert"
        icon="i-lucide-code-xml"
        :loading="status === 'processing'"
        @click="convert"
      />
      <UButton
        :label="copyLabel()"
        :color="copyColor()"
        variant="subtle"
        :icon="copyIcon()"
        :disabled="!output"
        @click="handleCopy"
      />
      <UButton
        label="Download"
        color="neutral"
        variant="subtle"
        icon="i-lucide-download"
        :disabled="!output"
        @click="handleDownload"
      />
      <UButton
        label="Clear"
        color="neutral"
        variant="ghost"
        icon="i-lucide-eraser"
        @click="handleClear"
      />
    </ToolActions>

    <ToolError
      v-if="error"
      :message="error"
    />

    <ToolEditor
      v-model="output"
      label="Output"
      readonly
      placeholder="Result appears here"
      :lang="outputLang"
    />

    <template #docs>
      <ToolDocs title="About SVG components">
        <div class="space-y-4 text-muted">
          <p>
            React output maps common SVG attributes to camelCase JSX names and spreads props onto the root svg element.
          </p>
          <p>
            Vue output wraps the cleaned SVG in a template block.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'SVG to PNG / WebP', to: '/hub/image/svg-converter' },
            { label: 'TS / JSX Transpiler', to: '/hub/dev/transpiler' }
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
