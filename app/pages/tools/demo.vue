<script setup lang="ts">
const input = ref('')
const output = ref('')
const toast = useToast()
const { status, error, result, run, reset } = useTool<string>()
const { copy } = useClipboard()

useSeoMeta({
  title: 'Tool Demo',
  description: 'Prove the shared tool UI.'
})

async function execute() {
  await run(() => {
    if (!input.value.trim()) {
      throw new Error('Enter input before you run the tool.')
    }

    return input.value.trim().toUpperCase()
  })

  if (status.value === 'success' && result.value !== null) {
    output.value = result.value
  }
}

async function handleCopy() {
  if (!output.value) {
    return
  }

  const ok = await copy(output.value)
  if (ok) {
    toast.add({ title: 'Copied', color: 'success' })
  } else {
    toast.add({ title: 'Copy failed', color: 'error' })
  }
}

function handleClear() {
  input.value = ''
  output.value = ''
  reset()
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
        title="Tool Demo"
        description="Prove the shared tool UI."
      />
    </template>

    <ToolEditor
      v-model="input"
      label="Input"
      placeholder="Type text here"
    />

    <ToolActions>
      <UButton
        label="Run"
        icon="i-lucide-play"
        :loading="status === 'processing'"
        @click="execute"
      />
      <UButton
        label="Copy"
        color="neutral"
        variant="subtle"
        icon="i-lucide-copy"
        :disabled="!output"
        @click="handleCopy"
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
    />

    <ToolStatus
      v-if="status === 'success'"
      message="Success"
      :meta="`${output.length} characters`"
    />
  </ToolPage>
</template>
