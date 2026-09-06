<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const props = defineProps<{
  modelValue: string
  executing?: boolean
  error?: string | null
  durationMs?: number
  rowCount?: number
  history?: string[]
  snippets?: { label: string, sql: string }[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'run': [sql: string]
}>()

const localSql = ref(props.modelValue)

watch(() => props.modelValue, (value) => {
  localSql.value = value
})

function handleRun() {
  emit('update:modelValue', localSql.value)
  emit('run', localSql.value)
}

function load(sql: string) {
  localSql.value = sql
  emit('update:modelValue', sql)
}

/** The formatter pulls in the SQL grammar, so it loads on the first click only. */
async function handleFormat() {
  const { formatSql } = await import('#shared/utils/data/sql')
  load(formatSql(localSql.value, { dialect: 'sqlite' }))
}

const historyItems = computed<DropdownMenuItem[]>(() => (props.history ?? []).map(sql => ({
  label: sql.replace(/\s+/g, ' ').slice(0, 70),
  icon: 'i-lucide-history',
  onSelect: () => load(sql)
})))

const snippetItems = computed<DropdownMenuItem[]>(() => (props.snippets ?? []).map(snippet => ({
  label: snippet.label,
  icon: 'i-lucide-code',
  onSelect: () => load(snippet.sql)
})))

onKeyStroke('Enter', (event) => {
  if (event.metaKey || event.ctrlKey) {
    event.preventDefault()
    handleRun()
  }
})
</script>

<template>
  <div class="flex flex-col border-b border-default bg-default">
    <div class="flex items-center justify-between gap-2 border-b border-default bg-elevated/40 px-3 py-1.5 text-xs">
      <div class="flex items-center gap-1">
        <span class="mr-2 font-medium text-muted">SQL</span>
        <UDropdownMenu
          v-if="snippetItems.length"
          :items="snippetItems"
        >
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-list"
            label="Snippets"
          />
        </UDropdownMenu>
        <UDropdownMenu
          :items="historyItems"
          :content="{ align: 'start' }"
        >
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-history"
            label="History"
            :disabled="!historyItems.length"
          />
        </UDropdownMenu>
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-lucide-align-left"
          label="Format"
          :disabled="!localSql.trim()"
          @click="handleFormat"
        />
      </div>
      <div class="flex items-center gap-3">
        <span
          v-if="durationMs !== undefined && durationMs >= 0"
          class="font-mono text-dimmed"
        >
          {{ durationMs }} ms · {{ rowCount }} rows
        </span>
        <UTooltip
          text="Run the query"
          :kbds="['meta', 'enter']"
        >
          <UButton
            label="Run Query"
            icon="i-lucide-play"
            size="xs"
            color="primary"
            :loading="executing"
            @click="handleRun"
          />
        </UTooltip>
      </div>
    </div>

    <div
      v-if="error"
      class="border-b border-error/30 bg-error/10 px-3 py-2 font-mono text-xs text-error"
    >
      {{ error }}
    </div>

    <div class="h-36">
      <LazyToolCodeMirror
        v-model="localSql"
        label="SQL query"
        lang="sql"
        placeholder="Enter a SQL statement"
        :wrap="false"
      />
    </div>
  </div>
</template>
