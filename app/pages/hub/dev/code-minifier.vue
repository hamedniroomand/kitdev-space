<script setup lang="ts">
import type { ByteDelta, CodeAction, FormatLanguage, FormatStyle } from '#shared/utils/dev/code-format'
import type { ToolEditorLang } from '#shared/utils/dev/editor-lang'
import {
  canFormatInBrowser,
  canMinify,
  downloadFileName,
  formatInBrowser,
  LANGUAGE_EXTENSIONS,
  measureBytes,
} from '#shared/utils/dev/code-format'

const SAMPLES: Record<FormatLanguage, string> = {
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
  vue: `<template><div   class="card">{{  title }}</div></template>

<script setup>
const  title="Hello"
<\/script>

<style scoped>
.card{padding:16px;color:#111}
</style>
`,
  css: `.card {
  color: #111111;
  background: #ffffff;
  padding: 16px;
  border-radius: 8px;
}
`,
  scss: `$brand:#111111;
.card{ padding:16px;
  .title{ color:$brand; font-weight:600 } }
`,
  json: `{
  "name": "KitDev",
  "ready": true,
  "tools": ["json", "css", "html"]
}
`,
  markdown: `#   KitDev
A  hub of developer tools.

*  Fast
*  Private
`,
  yaml: `name:   kitdev
scripts:
 build:   nuxt build
 tags:
 - dev
 - tools
`,
  graphql: `query   Tools( $limit : Int ) { tools( limit : $limit ) { id name } }
`,
  sql: `SELECT id, name FROM tools WHERE category='dev' ORDER BY name LIMIT 10;
`,
}

const EDITOR_LANGUAGES: Record<FormatLanguage, ToolEditorLang> = {
  javascript: 'javascript',
  typescript: 'typescript',
  html: 'html',
  vue: 'html',
  css: 'css',
  scss: 'css',
  json: 'json',
  markdown: 'markdown',
  yaml: 'yaml',
  graphql: 'text',
  sql: 'sql',
}

const MIME_TYPES: Record<FormatLanguage, string> = {
  javascript: 'text/javascript',
  typescript: 'text/typescript',
  html: 'text/html',
  vue: 'text/html',
  css: 'text/css',
  scss: 'text/css',
  json: 'application/json',
  markdown: 'text/markdown',
  yaml: 'text/yaml',
  graphql: 'application/graphql',
  sql: 'application/sql',
}

const language = ref<FormatLanguage>('javascript')
const action = ref<CodeAction>('minify')
const input = ref(SAMPLES.javascript)
const { applySample, syncSample } = useSampleInput(input, SAMPLES)
const output = ref('')
const engine = ref('')
const delta = ref<ByteDelta | null>(null)
/** The name of the file that loaded the code, for the download name. */
const sourceName = ref<string | null>(null)
const indent = useToolOption<string>('indent', '2')
const quotes = useToolOption<string>('quotes', 'double')
const { status, error, run, reset } = useTool<string>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const { downloadText } = useDownload()

const languageItems = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'HTML', value: 'html' },
  { label: 'Vue', value: 'vue' },
  { label: 'CSS', value: 'css' },
  { label: 'SCSS', value: 'scss' },
  { label: 'JSON', value: 'json' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'YAML', value: 'yaml' },
  { label: 'GraphQL', value: 'graphql' },
  { label: 'SQL', value: 'sql' },
]

const indentItems = [
  { label: '2 spaces', value: '2' },
  { label: '4 spaces', value: '4' },
  { label: 'Tab', value: 'tab' },
]

const quoteItems = [
  { label: 'Double quotes', value: 'double' },
  { label: 'Single quotes', value: 'single' },
]

const actionItems = computed(() => (
  canMinify(language.value)
    ? [{ label: 'Minify', value: 'minify' }, { label: 'Beautify', value: 'beautify' }]
    : [{ label: 'Beautify', value: 'beautify' }]
))

useToolSeo('code-minifier')

const editorLang = computed(() => EDITOR_LANGUAGES[language.value])

const style = computed<FormatStyle>(() => ({
  tabWidth: indent.value === '4' ? 4 : 2,
  useTabs: indent.value === 'tab',
  singleQuote: quotes.value === 'single',
}))

const engineLabel = computed(() => {
  switch (engine.value) {
    case 'oxc-minify':
      return 'OXC minifier'
    case 'prettier':
      return 'Prettier'
    case 'sql-formatter':
      return 'sql-formatter'
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

const downloadName = computed(() => downloadFileName(
  sourceName.value,
  action.value,
  LANGUAGE_EXTENSIONS[language.value],
))

function clearResult() {
  output.value = ''
  engine.value = ''
  delta.value = null
  reset()
}

watch(language, (next) => {
  // The result belongs to the old language, so clear it. Keep pasted code.
  syncSample(next)
  if (!canMinify(next)) {
    action.value = 'beautify'
  }
  clearResult()
})

// The result and the download name belong to the old action, so clear the result.
watch(action, clearResult)

async function execute() {
  const runsInBrowser = canFormatInBrowser(language.value, action.value)

  await run(async () => {
    if (runsInBrowser) {
      const local = await formatInBrowser(input.value, language.value, action.value, style.value)
      output.value = local.code
      engine.value = local.engine
      return local.code
    }

    const data = await $fetch<{ result: string, engine: string }>('/api/dev/code-format', {
      method: 'POST',
      body: {
        input: input.value,
        language: language.value,
        action: action.value,
      },
    })
    output.value = data.result
    engine.value = data.engine
    return data.result
  }, 'The format operation failed.', {
    runLocation: runsInBrowser ? 'browser' : 'server',
    option: `${action.value}:${language.value}`,
  })

  delta.value = status.value === 'success' && output.value
    ? measureBytes(input.value, output.value)
    : null
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
  downloadText(downloadName.value, output.value, MIME_TYPES[language.value])
}

function handleClear() {
  input.value = ''
  sourceName.value = null
  clearResult()
}

function handleSample() {
  sourceName.value = null
  applySample(language.value)
}

useToolShortcuts({
  onRun: () => execute(),
  onCopy: () => handleCopy(),
})
</script>

<template>
  <ToolPage>
    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-shield-check"
      title="Where the work runs"
      description="Every format action runs in your browser. HTML, CSS, and JSON minify also run in your browser. JavaScript and TypeScript minify run on the server with the OXC minifier."
    />

    <div class="flex flex-wrap gap-4">
      <UFormField label="Language">
        <USelect
          v-model="language"
          :items="languageItems"
          aria-label="Language"
          class="w-44"
        />
      </UFormField>
      <UFormField label="Action">
        <USelect
          v-model="action"
          :items="actionItems"
          aria-label="Action"
          class="w-40"
        />
      </UFormField>
      <UFormField
        v-if="action === 'beautify'"
        label="Indentation"
      >
        <USelect
          v-model="indent"
          :items="indentItems"
          aria-label="Indentation"
          class="w-40"
        />
      </UFormField>
      <UFormField
        v-if="action === 'beautify'"
        label="Quotes"
      >
        <USelect
          v-model="quotes"
          :items="quoteItems"
          aria-label="Quotes"
          class="w-44"
        />
      </UFormField>
    </div>

    <LazyToolEditor
      v-model="input"
      hydrate-on-idle
      label="Input"
      placeholder="Paste code here, or drop a file"
      :lang="editorLang"
      @file-loaded="sourceName = $event.name"
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

    <div
      v-if="delta"
      class="grid grid-cols-1 sm:grid-cols-3 gap-4"
    >
      <StatCard
        label="Raw output"
        :value="delta.outputBytes"
        unit="B"
        :description="`Input ${delta.inputBytes.toLocaleString()} B`"
        aria-label="Raw output bytes"
      />
      <StatCard
        label="Gzipped output"
        :value="delta.gzipBytes"
        unit="B"
        description="gzip level 6"
        aria-label="Gzipped output bytes"
      />
      <StatCard
        :label="delta.reductionPercent >= 0 ? 'Smaller' : 'Larger'"
        :value="`${Math.abs(delta.reductionPercent)}%`"
        :color="delta.reductionPercent >= 0 ? 'success' : 'warning'"
        description="Raw bytes against the input"
        aria-label="Size change"
      />
    </div>

    <LazyToolEditor
      v-model="output"
      hydrate-on-idle
      label="Output"
      readonly
      placeholder="Result appears here"
      :lang="editorLang"
    />

    <ToolStatus
      v-if="status === 'success'"
      :message="action === 'minify' ? 'Minified' : 'Formatted'"
      :meta="engineLabel"
    />

    <template #docs>
      <ToolDocs title="About minify and beautify">
        <div class="space-y-4 text-muted">
          <p>
            This tool compresses or formats source code for common web languages.
          </p>
          <p>
            Format runs <code>prettier/standalone</code> in your browser. Each parser plugin loads
            when you select its language, so the page stays small. Vue files use the
            <code>vue</code> parser of the Prettier HTML plugin.
          </p>
          <p>
            SQL is not a Prettier language. SQL format uses <code>sql-formatter</code>. JSON format
            uses the shared JSON formatter.
          </p>
          <p>
            The indentation and the quote choice stay in your browser storage. Minify ignores both.
          </p>
          <p>
            HTML, CSS, and JSON minify run in your browser. CSS minify uses CSSO. JavaScript and
            TypeScript minify use the OXC minifier on the server. OXC shortens names and removes
            dead code. TypeScript minify strips types with Bun first, then minifies the JavaScript.
          </p>
          <p>
            The result shows the raw byte count of the output, the gzipped byte count, and the
            change against the input. Gzip runs over the output bytes, so the count is exact.
          </p>
          <p>
            A drop of a file into the input editor loads the code and names the download. The tool
            minifies <code>app.js</code> to <code>app.min.js</code> and formats
            <code>app.min.js</code> to <code>app.pretty.js</code>. It never writes to your file.
          </p>
          <p>
            This tool does not store your input.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'AST Playground and Resolver', to: '/hub/dev/ast-playground' },
            { label: 'TS / JSX Transpiler', to: '/hub/dev/transpiler' },
            { label: 'JSON Formatter', to: '/hub/data/json-formatter' },
            { label: 'SQL Query Formatter', to: '/hub/data/sql-formatter' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
