<script setup lang="ts">
const props = defineProps<{
  databaseName: string
  sizeBytes: number
  tableCount: number
  pendingEdits: number
}>()

const emit = defineEmits<{
  downloadDb: []
  exportCsv: []
  exportJson: []
  close: []
}>()

const confirmOpen = ref(false)

function requestClose() {
  if (props.pendingEdits > 0) {
    confirmOpen.value = true
    return
  }
  emit('close')
}

function confirmClose() {
  confirmOpen.value = false
  emit('close')
}

const formattedSize = computed(() => {
  const bytes = props.sizeBytes
  if (!bytes)
    return '0 KB'
  if (bytes < 1024)
    return `${bytes} B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
})
</script>

<template>
  <header class="h-12 border-b border-default flex items-center justify-between px-4 bg-default">
    <div class="flex items-center gap-3">
      <UIcon
        name="i-lucide-database"
        class="w-5 h-5 text-primary"
      />
      <span class="font-medium text-sm text-highlighted">{{ databaseName }}</span>
      <span class="text-xs text-muted font-mono">({{ formattedSize }} • {{ tableCount }} tables)</span>
      <UBadge
        v-if="pendingEdits > 0"
        color="warning"
        variant="subtle"
        size="sm"
        :aria-label="`${pendingEdits} changes are not downloaded`"
      >
        {{ pendingEdits }} unsaved {{ pendingEdits === 1 ? 'change' : 'changes' }}
      </UBadge>
    </div>

    <div class="flex items-center gap-2">
      <UButton
        label="Export results (CSV)"
        icon="i-lucide-file-spreadsheet"
        size="xs"
        color="neutral"
        variant="ghost"
        @click="emit('exportCsv')"
      />
      <UButton
        label="Export results (JSON)"
        icon="i-lucide-file-json"
        size="xs"
        color="neutral"
        variant="ghost"
        @click="emit('exportJson')"
      />
      <UButton
        label="Export database (.sqlite)"
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
        @click="requestClose"
      />
    </div>

    <UModal
      v-model:open="confirmOpen"
      title="Close without saving?"
      :description="`${pendingEdits} ${pendingEdits === 1 ? 'change is' : 'changes are'} not downloaded yet. The browser saves no file for you, so closing loses them.`"
    >
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            label="Keep working"
            color="neutral"
            variant="ghost"
            @click="confirmOpen = false"
          />
          <UButton
            label="Close and lose changes"
            color="error"
            variant="subtle"
            @click="confirmClose"
          />
        </div>
      </template>
    </UModal>
  </header>
</template>
