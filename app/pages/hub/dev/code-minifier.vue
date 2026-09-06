<script setup lang="ts">
import { getTextStats } from '#shared/utils/data/stats'

type CodeLanguage = 'javascript' | 'typescript' | 'html' | 'css' | 'json'
type CodeAction = 'minify' | 'beautify'

const SAMPLES: Record<CodeLanguage, string> = {
  javascript: `function greet(name) {
  const message = "Hello, " + name + "!";
  console.log(message);
  return message;
}

greet("world");
`,
  typescript: `type User = { name: string }

export function greet(user: User): string {
  const message = \`Hello, \${user.name}!\`
  console.log(message)
  return message
}
`,
  html: `<!DOCTYPE html>
<html>
  <head>
    <title>Demo</title>
  </head>
  <body>
    <h1 class="title">Hello</h1>
    <!-- comment -->
    <p>Welcome</p>
  </body>
</html>
`,
  css: `.card {
  color: #111111;
  background: #ffffff;
  padding: 16px;
  border-radius: 8px;
}
`,
  json: `{
  "name": "KitDev",
  "ready": true,
  "tools": ["json", "css", "html"]
}
`
}

const language = ref<CodeLanguage>('javascript')
const action = ref<CodeAction>('minify')
const input = ref(SAMPLES.javascript)
const output = ref('')
const engine = ref('')
const statusMeta = ref('')
const { status, error, run, reset } = useTool<string>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const { downloadText } = useDownload()

const languageItems = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'JSON', value: 'json' }
]

const actionItems = [
  { label: 'Minify', value: 'minify' },
  { label: 'Beautify', value: 'beautify' }
]

useToolSeo('code-minifier')

const editorLang = computed(() => language.value)

const engineLabel = computed(() => {
  switch (engine.value) {
    case 'oxc-minify':
      return 'OXC minifier'
    case 'prettier':
      return 'Prettier'
    case 'csso':
      return 'CSSO'
    case 'json':
      return 'JSON'
    case 'html':
      return 'HTML'
    default:
      return ''
  }
})

const downloadName = computed(() => {
  const ext = {
    javascript: 'js',
    typescript: 'ts',
    html: 'html',
    css: 'css',
    json: 'json'
  }[language.value]
  return action.value === 'minify' ? `minified.${ext}` : `formatted.${ext}`
})

const downloadMime = computed(() => {
  switch (language.value) {
    case 'javascript':
      return 'text/javascript'
    case 'typescript':
      return 'text/typescript'
    case 'html':
      return 'text/html'
    case 'css':
      return 'text/css'
    case 'json':
    default:
      return 'application/json'
  }
})

watch(language, (next) => {
  input.value = SAMPLES[next]
  output.value = ''
  engine.value = ''
  statusMeta.value = ''
  reset()
})

async function execute() {
  await run(async () => {
    try {
      const data = await $fetch<{ result: string, engine: string }>('/api/dev/code-format', {
        method: 'POST',
        body: {
          input: input.value,
          language: language.value,
          action: action.value
        }
      })
      output.value = data.result
      engine.value = data.engine
      return data.result
    } catch (cause) {
      const fetchError = cause as { data?: { message?: string }, statusMessage?: string }
      throw new Error(
        fetchError.data?.message || fetchError.statusMessage || 'The format operation failed.',
        { cause }
      )
    }
  })

  if (status.value === 'success' && output.value) {
    const before = getTextStats(input.value)
    const after = getTextStats(output.value)
    const saved = before.bytes === 0
      ? 0
      : Math.round(((before.bytes - after.bytes) / before.bytes) * 100)
    statusMeta.value = action.value === 'minify'
      ? `${after.bytes} bytes · ${saved}% smaller · ${engineLabel.value}`
      : `${after.lines} lines · ${engineLabel.value}`
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
  downloadText(downloadName.value, output.value, downloadMime.value)
}

function handleClear() {
  input.value = ''
  output.value = ''
  engine.value = ''
  statusMeta.value = ''
  reset()
}

function handleSample() {
  input.value = SAMPLES[language.value]
}

defineShortcuts({
  meta_enter: {
    usingInput: true,
    handler: () => {
      execute()
    }
  }
})
</script>

<template>
  <ToolPage>
    <template #header>
      <ToolHeader
        title="Code Minifier and Beautifier"
        description="Minify and format JavaScript, TypeScript, HTML, CSS, and JSON."
      />
    </template>

    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-server"
      title="Processed on the server"
      description="JavaScript and TypeScript minify use the OXC minifier. Beautify uses Prettier. CSS minify uses CSSO."
    />

    <div class="flex flex-wrap gap-4">
      <UFormField label="Language">
        <USelect
          v-model="language"
          :items="languageItems"
          class="w-44"
        />
      </UFormField>
      <UFormField label="Action">
        <USelect
          v-model="action"
          :items="actionItems"
          class="w-40"
        />
      </UFormField>
    </div>

    <ToolEditor
      v-model="input"
      label="Input"
      placeholder="Paste code here"
      :lang="editorLang"
    />

    <ToolActions>
      <UButton
        :label="action === 'minify' ? 'Minify' : 'Beautify'"
        icon="i-lucide-minimize-2"
        :loading="status === 'processing'"
        @click="execute"
      />
      <UButton
        label="Sample"
        color="neutral"
        variant="subtle"
        icon="i-lucide-file-text"
        @click="handleSample"
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
      :lang="editorLang"
    />

    <ToolStatus
      v-if="status === 'success'"
      :message="action === 'minify' ? 'Minified' : 'Formatted'"
      :meta="statusMeta"
    />

    <template #docs>
      <DataToolDocs title="About minify and beautify">
        <div class="space-y-4 text-muted">
          <p>
            This tool compresses or formats source code for common web languages.
          </p>
          <p>
            JavaScript and TypeScript minify use the OXC minifier. OXC shortens names and removes dead code.
          </p>
          <p>
            TypeScript minify strips types with Bun first, then minifies the JavaScript with OXC.
          </p>
          <p>
            Beautify uses Prettier for JavaScript, TypeScript, HTML, and CSS. JSON uses the shared JSON formatter.
          </p>
          <p>
            This tool does not store your input.
          </p>
        </div>
        <DataRelatedTools
          class="mt-8"
          :items="[
            { label: 'AST Playground and Resolver', to: '/hub/dev/ast-playground' },
            { label: 'TS / JSX Transpiler', to: '/hub/dev/transpiler' },
            { label: 'JSON Formatter', to: '/hub/data/json-formatter' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
