<script setup lang="ts">
import type { QueryResult } from '~/types/sqlite'

const props = defineProps<{
  results: QueryResult[]
}>()

const active = defineModel<number>({ default: 0 })

watch(() => props.results, () => {
  active.value = 0
})

function summary(result: QueryResult): string {
  if (result.rowsAffected !== undefined) {
    return `${result.rowsAffected} ${result.rowsAffected === 1 ? 'row' : 'rows'} affected`
  }
  if (result.columns.length > 0) {
    return `${result.rowCount} ${result.rowCount === 1 ? 'row' : 'rows'}`
  }
  return 'no rows'
}

function shortSql(sql: string | undefined, index: number): string {
  if (!sql) {
    return `Statement ${index + 1}`
  }
  const oneLine = sql.replace(/\s+/g, ' ').trim()
  return oneLine.length > 40 ? `${oneLine.slice(0, 40)}…` : oneLine
}
</script>

<template>
  <div class="flex items-center gap-1 overflow-x-auto border-b border-default bg-elevated/30 px-3 py-1.5">
    <UButton
      v-for="(result, idx) in props.results"
      :key="idx"
      size="xs"
      :variant="active === idx ? 'solid' : 'ghost'"
      color="neutral"
      class="shrink-0 font-mono text-xs"
      :aria-label="`Result of statement ${idx + 1}: ${summary(result)}`"
      :aria-current="active === idx ? 'true' : undefined"
      @click="active = idx"
    >
      <span class="text-dimmed">{{ idx + 1 }}.</span>
      <span>{{ shortSql(result.sql, idx) }}</span>
      <span class="text-dimmed">· {{ summary(result) }}</span>
    </UButton>
  </div>
</template>
