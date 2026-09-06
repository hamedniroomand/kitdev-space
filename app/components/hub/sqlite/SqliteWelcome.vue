<script setup lang="ts">
import { useDropZone } from '@vueuse/core'

defineProps<{
  loading?: boolean
}>()

const emit = defineEmits<{
  loadFile: [file: File]
  createBlank: []
  loadSample: []
}>()

const dropZoneRef = ref<HTMLDivElement>()
const fileInput = ref<HTMLInputElement>()

useDropZone(dropZoneRef, {
  onDrop: (files) => {
    if (files && files[0]) {
      emit('loadFile', files[0])
    }
  }
})

function onFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    emit('loadFile', target.files[0])
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
    <div
      ref="dropZoneRef"
      class="w-full max-w-xl border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 hover:border-primary transition-colors cursor-pointer flex flex-col items-center gap-4 bg-gray-50 dark:bg-gray-900/50"
      @click="fileInput?.click()"
    >
      <input
        ref="fileInput"
        type="file"
        accept=".sqlite,.db,.sqlite3"
        class="hidden"
        @change="onFileSelect"
      >
      <div class="p-4 rounded-full bg-primary/10 text-primary">
        <UIcon
          name="i-lucide-database"
          class="w-10 h-10"
        />
      </div>
      <div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">
          Drop your SQLite file here
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Supports .sqlite, .db, and .sqlite3. Your database stays in your browser.
        </p>
      </div>
      <UButton
        label="Select File"
        icon="i-lucide-upload"
        color="neutral"
        variant="outline"
        size="sm"
      />
    </div>

    <div class="flex items-center gap-3 mt-6">
      <UButton
        label="Create Blank Database"
        icon="i-lucide-plus"
        color="neutral"
        variant="soft"
        :loading="loading"
        @click="emit('createBlank')"
      />
      <span class="text-xs text-gray-400">or</span>
      <UButton
        label="Load Sample Database"
        icon="i-lucide-folder-open"
        color="primary"
        variant="subtle"
        :loading="loading"
        @click="emit('loadSample')"
      />
    </div>
  </div>
</template>
