<script setup lang="ts">
import type { SqlDialect, SqlIndent, SqlKeywordCase } from '#shared/utils/data/sql'
import { createSqlLinter, formatSql, validateSql } from '#shared/utils/data/sql'
import { getTextStats } from '#shared/utils/data/stats'

const SAMPLE_QUERY
  = `select u.id, u.name, u.email, count(o.id) as total_orders, sum(o.total_amount) as total_spent from users u left join orders o on u.id = o.user_id where u.status = 'active' and u.created_at >= '2025-01-01' group by u.id, u.name, u.email having count(o.id) > 0 order by total_spent desc limit 10;`

const dialectItems = [
  { label: 'Standard SQL', value: 'sql' },
  { label: 'PostgreSQL', value: 'postgresql' },
  { label: 'MySQL', value: 'mysql' },
  { label: 'SQLite', value: 'sqlite' },
  { label: 'Transact-SQL', value: 'transactsql' },
]

const indentItems = [
  { label: '2 spaces', value: '2' },
  { label: '4 spaces', value: '4' },
  { label: 'Tabs', value: 'tab' },
]

const keywordCaseItems = [
  { label: 'UPPERCASE', value: 'upper' },
  { label: 'lowercase', value: 'lower' },
  { label: 'Preserve', value: 'preserve' },
]

const dialect = ref<SqlDialect>('sql')
const indent = ref<SqlIndent>('2')
const keywordCase = ref<SqlKeywordCase>('upper')

const input = ref(SAMPLE_QUERY)
const output = ref('')
const statusMessage = ref('')
const statusMeta = ref('')

const { status, error, result, run, reset } = useTool<string>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const validateFeedback = useActionFeedback({
  idle: {
    label: 'Validate',
    icon: 'i-lucide-circle-check',
    color: 'neutral',
    variant: 'subtle',
  },
  success: {
    label: 'Valid',
    icon: 'i-lucide-check',
    color: 'success',
    variant: 'subtle',
  },
  error: {
    label: 'Invalid',
    icon: 'i-lucide-x',
    color: 'error',
    variant: 'subtle',
  },
})

const { downloadText } = useDownload()

useToolSeo('sql-formatter')
const { reportInput } = useToolInput()

const linterExtension = computed(() => createSqlLinter(() => dialect.value))

function setStats(text: string) {
  const stats = getTextStats(text)
  statusMeta.value = `${stats.lines} lines · ${stats.characters} characters · ${stats.bytes} bytes`
}

async function format() {
  validateFeedback.reset()
  await run(() => formatSql(input.value, {
    dialect: dialect.value,
    indent: indent.value,
    keywordCase: keywordCase.value,
  }))

  if (status.value === 'success' && result.value !== null) {
    output.value = result.value
    statusMessage.value = 'Formatted successfully'
    setStats(output.value)
  }
}

async function validate() {
  await run(() => {
    const outcome = validateSql(input.value, dialect.value)
    if (!outcome.valid) {
      throw new Error(outcome.error ?? 'Invalid SQL syntax')
    }
    return 'ok'
  })

  if (status.value === 'success') {
    statusMessage.value = 'Valid SQL query'
    setStats(input.value)
    validateFeedback.flashSuccess()
  }
  else if (status.value === 'error') {
    validateFeedback.flashError()
  }
}

function handleSample() {
  reportInput('sample')
  input.value = SAMPLE_QUERY
  output.value = ''
  statusMessage.value = ''
  statusMeta.value = ''
  validateFeedback.reset()
  reset()
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
  downloadText('query.sql', output.value, 'text/x-sql')
}

function handleClear() {
  input.value = ''
  output.value = ''
  statusMessage.value = ''
  statusMeta.value = ''
  validateFeedback.reset()
  reset()
}

defineShortcuts({
  meta_enter: {
    usingInput: true,
    handler: () => {
      format()
    },
  },
})
</script>

<template>
  <ToolPage>
    <div class="flex flex-wrap items-center gap-4">
      <UFormField label="Dialect">
        <USelect
          v-model="dialect"
          :items="dialectItems"
          class="w-44"
        />
      </UFormField>

      <UFormField label="Indentation">
        <USelect
          v-model="indent"
          :items="indentItems"
          class="w-36"
        />
      </UFormField>

      <UFormField label="Keyword Case">
        <USelect
          v-model="keywordCase"
          :items="keywordCaseItems"
          class="w-36"
        />
      </UFormField>
    </div>

    <LazyToolEditor
      v-model="input"
      hydrate-on-idle
      label="Input"
      placeholder="Paste SQL query here"
      lang="sql"
      :extensions="[linterExtension]"
    />

    <ToolActions>
      <UButton
        label="Format"
        icon="i-lucide-align-left"
        :loading="status === 'processing'"
        @click="format"
      />
      <UButton
        :label="validateFeedback.label"
        :color="validateFeedback.color"
        :variant="validateFeedback.variant"
        :icon="validateFeedback.icon"
        @click="validate"
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

    <LazyToolEditor
      v-model="output"
      hydrate-on-idle
      label="Output"
      readonly
      placeholder="Formatted query appears here"
      lang="sql"
    />

    <ToolStatus
      v-if="status === 'success' && statusMessage"
      :message="statusMessage"
      :meta="statusMeta"
    />

    <template #docs>
      <ToolDocs title="About SQL query formatting">
        <div class="space-y-4 text-muted">
          <p>
            SQL query formatting indents clauses, aligns keywords, and wraps expressions.
            This improves readability for complex database statements.
          </p>
          <p>
            The formatter supports Standard SQL, PostgreSQL, MySQL, SQLite, and Transact-SQL.
            You can configure indentation to two spaces, four spaces, or tabs.
            You can also transform keywords to UPPERCASE or lowercase.
          </p>
          <p>
            Live syntax checking highlights syntax errors directly in the editor as you type.
            Select Format or press <UKbd value="meta" /> + <UKbd value="enter" /> to run the formatter.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'JSON Formatter', to: '/hub/data/json-formatter' },
            { label: 'Text Diff', to: '/hub/data/text-diff' },
            { label: 'Code Minifier', to: '/hub/dev/code-minifier' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
