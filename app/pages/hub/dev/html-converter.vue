<script setup lang="ts">
import {
  convertHtmlToJsx,
  convertHtmlToVue
} from '#shared/utils/dev/html-converter'
import type { ToolEditorLang } from '#shared/utils/dev/editor-lang'

type TargetFormat = 'jsx' | 'vue-template' | 'vue-sfc'

const sampleHtml = `<div class="card" style="padding: 20px; background-color: #f8fafc; border-radius: 8px;">
  <!-- User Profile Section -->
  <h2 class="title">User Profile</h2>
  <img src="/avatar.jpg" alt="User Avatar" class="avatar">
  <form class="profile-form">
    <label for="username-input" class="form-label">Username</label>
    <input type="text" id="username-input" class="input-field" placeholder="Enter username">
    <br>
    <button type="button" class="btn primary" onclick="saveProfile()">Save Changes</button>
  </form>
</div>`

const sampleSvg = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
  <!-- Checkmark icon -->
  <circle cx="12" cy="12" r="10" stroke-width="2" />
  <path d="m9 12 2 2 4-4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
</svg>`

const htmlInput = ref(sampleHtml)
const targetFormat = ref<TargetFormat>('jsx')
const wrapJsxComponent = ref(true)
const componentName = ref('UserProfileCard')

const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const { downloadText } = useDownload()

useToolSeo('html-converter')

function loadSample(type: 'card' | 'svg') {
  htmlInput.value = type === 'card' ? sampleHtml : sampleSvg
}

function handleClear() {
  htmlInput.value = ''
}

const convertedOutput = computed(() => {
  if (!htmlInput.value.trim()) return ''

  if (targetFormat.value === 'jsx') {
    return convertHtmlToJsx(htmlInput.value, {
      wrapComponent: wrapJsxComponent.value,
      componentName: componentName.value
    })
  }

  if (targetFormat.value === 'vue-sfc') {
    return convertHtmlToVue(htmlInput.value, { wrapSfc: true })
  }

  return convertHtmlToVue(htmlInput.value, { wrapSfc: false })
})

const editorLang = computed<ToolEditorLang>(() => {
  if (targetFormat.value === 'jsx') return 'javascript'
  if (targetFormat.value === 'vue-sfc') return 'html'
  return 'html'
})

function handleCopy() {
  if (convertedOutput.value) {
    copy(convertedOutput.value)
  }
}

function handleDownload() {
  if (!convertedOutput.value) return
  const isJsx = targetFormat.value === 'jsx'
  const isSfc = targetFormat.value === 'vue-sfc'

  const ext = isJsx ? 'jsx' : (isSfc ? 'vue' : 'html')
  const mime = isJsx ? 'text/javascript' : 'text/html'
  const name = isJsx ? (componentName.value || 'Component') : 'Template'

  downloadText(`${name}.${ext}`, convertedOutput.value, mime)
}
</script>

<template>
  <ToolPage
    title="HTML to JSX / Vue Converter"
    description="Convert standard HTML markup and inline styles into React JSX or Vue template component syntax."
  >
    <div class="space-y-6">
      <!-- Toolbar Controls -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-medium text-muted">Load Sample:</span>
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            label="Form Card"
            @click="loadSample('card')"
          />
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            label="SVG Icon"
            @click="loadSample('svg')"
          />
        </div>

        <div class="flex items-center gap-2">
          <UButton
            label="Clear"
            icon="i-lucide-eraser"
            size="xs"
            color="neutral"
            variant="ghost"
            :disabled="!htmlInput"
            @click="handleClear"
          />
        </div>
      </div>

      <!-- Main Dual Editor Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Input HTML Column -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-xs font-semibold text-default flex items-center gap-1.5">
              <UIcon
                name="i-lucide-code"
                class="w-4 h-4 text-primary"
              />
              HTML Input
            </label>
          </div>

          <ToolEditor
            v-model="htmlInput"
            label="HTML Source"
            lang="html"
            :rows="22"
          />
        </div>

        <!-- Converted Output Column -->
        <div class="space-y-3">
          <!-- Target Options Bar -->
          <div class="flex flex-wrap items-center justify-between gap-2">
            <!-- Format selector -->
            <div class="flex items-center rounded-lg border border-default p-0.5 bg-default">
              <UButton
                size="xs"
                :variant="targetFormat === 'jsx' ? 'solid' : 'ghost'"
                color="neutral"
                label="JSX (React)"
                @click="targetFormat = 'jsx'"
              />
              <UButton
                size="xs"
                :variant="targetFormat === 'vue-template' ? 'solid' : 'ghost'"
                color="neutral"
                label="Vue Template"
                @click="targetFormat = 'vue-template'"
              />
              <UButton
                size="xs"
                :variant="targetFormat === 'vue-sfc' ? 'solid' : 'ghost'"
                color="neutral"
                label="Vue SFC"
                @click="targetFormat = 'vue-sfc'"
              />
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2">
              <UButton
                size="xs"
                variant="subtle"
                color="neutral"
                icon="i-lucide-download"
                label="Download"
                :disabled="!convertedOutput"
                @click="handleDownload"
              />
              <UButton
                size="xs"
                variant="subtle"
                :label="copyLabel()"
                :color="copyColor()"
                :icon="copyIcon()"
                :disabled="!convertedOutput"
                @click="handleCopy"
              />
            </div>
          </div>

          <!-- Extra Settings for JSX -->
          <div
            v-if="targetFormat === 'jsx'"
            class="flex items-center gap-3 p-2.5 rounded-lg border border-default bg-elevated/20"
          >
            <label class="flex items-center gap-2 text-xs font-medium text-default cursor-pointer select-none">
              <input
                v-model="wrapJsxComponent"
                type="checkbox"
                class="rounded border-default text-primary"
              >
              Wrap in component function
            </label>

            <div
              v-if="wrapJsxComponent"
              class="flex items-center gap-2 ml-auto"
            >
              <span class="text-xs text-muted">Name:</span>
              <UInput
                v-model="componentName"
                placeholder="ComponentName"
                class="w-40 font-mono text-xs"
                size="xs"
              />
            </div>
          </div>

          <!-- Converted Editor -->
          <ToolEditor
            :model-value="convertedOutput"
            :label="`Output (${targetFormat.toUpperCase()})`"
            :lang="editorLang"
            :rows="targetFormat === 'jsx' && wrapJsxComponent ? 19 : 22"
            readonly
          />
        </div>
      </div>
    </div>
  </ToolPage>
</template>
