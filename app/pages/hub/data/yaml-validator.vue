<script setup lang="ts">
import type { EditorView } from '@codemirror/view'
import type { YamlValidationIssue, YamlVersion } from '#shared/utils/data/yaml-validator'
import { createYamlLinter, validateYaml } from '#shared/utils/data/yaml-validator'
import { captureEditorView, goToLineColumn } from '#shared/utils/dev/editor-cursor'

useToolSeo('yaml-validator')

const sampleValidYaml = `server:
  port: 8080
  host: 0.0.0.0
database:
  name: production_db
  pool_size: 10
features:
  - analytics
  - caching
  - rate_limiting`

const sampleInvalidYaml = `server:
  port: 8080
    host: bad_indentation`

const sampleMultiDocYaml = `# Two documents in one stream
kind: Service
name: api
---
kind: Deployment
name: api
replicas: 3`

const input = ref(sampleValidYaml)
const yamlVersion = useToolOption<YamlVersion>('version', '1.2')
const { copy, label, color, icon } = useCopyFeedback()
const { downloadText } = useDownload()

const versionItems = [
  { label: 'YAML 1.2', value: '1.2' },
  { label: 'YAML 1.1', value: '1.1' },
]

const result = computed(() => validateYaml(input.value, yamlVersion.value))
useLiveTool(result)

// The getter lets a version change relint without rebuilding the extension.
const yamlLinter = createYamlLinter(() => yamlVersion.value)

const editorView = shallowRef<EditorView | null>(null)
const captureView = captureEditorView((view) => {
  editorView.value = view
})

function handleGoToIssue(issue: YamlValidationIssue) {
  if (!editorView.value || issue.line === undefined) {
    return
  }
  goToLineColumn(editorView.value, issue.line, issue.column ?? 1)
}

function issueTitle(issue: YamlValidationIssue, fallback: string) {
  const place = issue.line
    ? `Line ${issue.line}, column ${issue.column ?? 1}`
    : fallback
  return result.value.documentCount > 1 && issue.docIndex !== undefined
    ? `Document ${issue.docIndex + 1} — ${place}`
    : place
}

function handleLoadValid() {
  input.value = sampleValidYaml
}

function handleLoadInvalid() {
  input.value = sampleInvalidYaml
}

function handleLoadMultiDoc() {
  input.value = sampleMultiDocYaml
}

function handleClear() {
  input.value = ''
}

function handleCopyJson() {
  if (result.value.formattedJson) {
    copy(result.value.formattedJson)
  }
}

function handleDownloadJson() {
  if (result.value.formattedJson) {
    downloadText('yaml-output.json', result.value.formattedJson, 'application/json')
  }
}
</script>

<template>
  <ToolPage>
    <div class="space-y-6">
      <!-- Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <div class="flex flex-wrap items-center gap-2">
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-check-circle"
            label="Load Valid Sample"
            @click="handleLoadValid"
          />
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-alert-circle"
            label="Load Invalid Sample"
            @click="handleLoadInvalid"
          />
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-files"
            label="Load Multi-Document Sample"
            @click="handleLoadMultiDoc"
          />
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <USelect
            v-model="yamlVersion"
            :items="versionItems"
            size="xs"
            aria-label="YAML specification version"
          />

          <UBadge
            v-if="input.trim() && result.documentCount > 1"
            color="neutral"
            variant="subtle"
            size="md"
          >
            {{ result.documentCount }} documents
          </UBadge>

          <UBadge
            v-if="input.trim()"
            :color="result.isValid ? 'success' : 'error'"
            variant="subtle"
            size="md"
          >
            {{ result.isValid ? 'Valid YAML' : 'Syntax Error' }}
          </UBadge>

          <UButton
            v-if="result.formattedJson"
            :label="label()"
            :color="color()"
            :icon="icon()"
            size="xs"
            variant="subtle"
            @click="handleCopyJson"
          />

          <UButton
            v-if="result.formattedJson"
            label="Download JSON"
            icon="i-lucide-download"
            size="xs"
            color="neutral"
            variant="subtle"
            @click="handleDownloadJson"
          />

          <UButton
            label="Clear"
            icon="i-lucide-eraser"
            size="xs"
            color="neutral"
            variant="ghost"
            :disabled="!input"
            @click="handleClear"
          />
        </div>
      </div>

      <!-- Errors -->
      <div
        v-if="result.errors.length > 0"
        class="space-y-2"
      >
        <UAlert
          v-for="(err, idx) in result.errors"
          :key="`error-${idx}`"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          :title="issueTitle(err, 'Syntax error')"
          :description="err.message"
          :ui="{ root: err.line ? 'cursor-pointer' : '' }"
          :role="err.line ? 'button' : undefined"
          :tabindex="err.line ? 0 : undefined"
          :aria-label="err.line ? `Go to line ${err.line} in the editor` : undefined"
          @click="handleGoToIssue(err)"
          @keydown.enter="handleGoToIssue(err)"
          @keydown.space.prevent="handleGoToIssue(err)"
        />
      </div>

      <!-- Warnings -->
      <div
        v-if="result.warnings.length > 0"
        class="space-y-2"
      >
        <UAlert
          v-for="(warn, idx) in result.warnings"
          :key="`warning-${idx}`"
          color="warning"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          :title="issueTitle(warn, 'Warning')"
          :description="warn.message"
          :ui="{ root: warn.line ? 'cursor-pointer' : '' }"
          :role="warn.line ? 'button' : undefined"
          :tabindex="warn.line ? 0 : undefined"
          :aria-label="warn.line ? `Go to line ${warn.line} in the editor` : undefined"
          @click="handleGoToIssue(warn)"
          @keydown.enter="handleGoToIssue(warn)"
          @keydown.space.prevent="handleGoToIssue(warn)"
        />
      </div>

      <!-- Editors Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LazyToolEditor
          v-model="input"
          hydrate-on-idle
          label="YAML Source"
          lang="yaml"
          :rows="18"
          :extensions="[yamlLinter, captureView]"
          accept=".yaml,.yml,text/yaml,text/plain"
          placeholder="Paste YAML content here to validate..."
        />

        <LazyToolEditor
          hydrate-on-idle
          :model-value="result.formattedJson"
          label="Parsed JSON Structure"
          lang="json"
          :rows="18"
          readonly
          placeholder="Parsed JSON output appears here when YAML is valid..."
        />
      </div>
    </div>

    <template #docs>
      <ToolDocs title="About YAML validation">
        <div class="space-y-4 text-muted">
          <p>
            This tool checks that a YAML document has a valid syntax. It marks each error in the editor gutter. Click an error in the list to move the cursor to that position.
          </p>
          <p>
            <strong>Multi-document streams:</strong>
            A stream can hold more than one document. Three dashes (<code>---</code>) separate them. The tool reads every document and names the document that holds an error. One document gives its own JSON value. More than one document gives a JSON array.
          </p>
          <p>
            <strong>Version rules:</strong>
            The tool uses YAML 1.2 by default. YAML 1.1 reads <code>yes</code>, <code>no</code>, <code>on</code>, and <code>off</code> as booleans, and it reads a number with a leading zero as octal. YAML 1.2 keeps those values as text. Change the version control to compare the two.
          </p>
          <p>
            <strong>Duplicate keys:</strong>
            A repeated key does not stop the parse, so the tool reports it as a warning and names the line. The last value wins.
          </p>
          <p>
            <strong>Circular aliases:</strong>
            An anchor that refers to itself makes a structure that JSON cannot hold. The tool gives a clear error instead of an empty result.
          </p>
          <p>
            Most YAML errors come from the indentation. YAML uses spaces and never a tab. A tab character gives an error that is hard to see, because the two look the same on the screen.
          </p>
          <p>
            Another common error is an unquoted value that YAML reads as a number or boolean. A version such as 1.10 becomes the number 1.1. Put quotes around a value to keep it as text.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'JSON ↔ YAML', to: '/hub/data/converters/json-yaml' },
            { label: 'JSON Formatter', to: '/hub/data/json-formatter' },
            { label: 'JSON Schema Validator', to: '/hub/data/json-schema' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
