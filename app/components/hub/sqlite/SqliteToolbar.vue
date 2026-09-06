<script setup lang="ts">
const props = defineProps<{
  databaseName: string
  sizeBytes: number
  tableCount: number
}>()

const emit = defineEmits<{
  downloadDb: []
  exportCsv: []
  exportJson: []
  close: []
}>()

const formattedSize = computed(() => {
  const bytes = props.sizeBytes
  if (!bytes) return '0 KB'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
})
</script>

<template>
  <header class="h-12 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 bg-white dark:bg-gray-900">
    <div class="flex items-center gap-3">
      <UIcon
        name="i-lucide-database"
        class="w-5 h-5 text-primary"
      />
      <span class="font-medium text-sm text-gray-900 dark:text-gray-100">{{ databaseName }}</span>
      <span class="text-xs text-gray-400 font-mono">({{ formattedSize }} • {{ tableCount }} tables)</span>
    </div>

    <div class="flex items-center gap-2">
      <UButton
        label="Export CSV"
        icon="i-lucide-file-spreadsheet"
        size="xs"
        color="neutral"
        variant="ghost"
        @click="emit('exportCsv')"
      />
      <UButton
        label="Export JSON"
        icon="i-lucide-file-json"
        size="xs"
        color="neutral"
        variant="ghost"
        @click="emit('exportJson')"
      />
      <UButton
        label="Download .db"
        icon="i-lucide-download"
        size="xs"
        color="primary"
        variant="subtle"
        @click="emit('downloadDb')"
      />
      <UButton
        label="Close"
        icon="i-lucide-x"
        size="xs"
        color="neutral"
        variant="ghost"
        @click="emit('close')"
      />
    </div>
  </header>
</template>
