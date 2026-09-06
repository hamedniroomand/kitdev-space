<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core'

const props = defineProps<{
  modelValue: string
  executing?: boolean
  error?: string | null
  durationMs?: number
  rowCount?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'run': [sql: string]
}>()

const localSql = ref(props.modelValue)

watch(() => props.modelValue, (val) => {
  localSql.value = val
})

function handleRun() {
  emit('update:modelValue', localSql.value)
  emit('run', localSql.value)
}

onKeyStroke('Enter', (event) => {
  if (event.metaKey || event.ctrlKey) {
    event.preventDefault()
    handleRun()
  }
})
</script>

<template>
  <div class="flex flex-col border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
    <div class="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 text-xs">
      <span class="font-medium text-gray-500">SQL Query (Cmd + Enter to run)</span>
      <div class="flex items-center gap-3">
        <span
          v-if="durationMs !== undefined && durationMs >= 0"
          class="text-gray-400 font-mono"
        >
          {{ durationMs }} ms • {{ rowCount }} rows
        </span>
        <UButton
          label="Run Query"
          icon="i-lucide-play"
          size="xs"
          color="primary"
          :loading="executing"
          @click="handleRun"
        />
      </div>
    </div>

    <div
      v-if="error"
      class="px-3 py-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs border-b border-red-200 dark:border-red-900 font-mono"
    >
      {{ error }}
    </div>

    <div class="min-h-[110px] max-h-[160px] overflow-auto">
      <textarea
        v-model="localSql"
        rows="4"
        class="w-full h-full p-3 font-mono text-xs bg-transparent border-0 focus:ring-0 resize-none text-gray-900 dark:text-gray-100"
        placeholder="Enter SQL statement..."
      />
    </div>
  </div>
</template>
