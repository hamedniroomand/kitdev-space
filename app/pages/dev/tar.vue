<script setup lang="ts">
interface TarEntry {
  path: string
  size: number
  type: string
}

const file = ref<File | null>(null)
const entries = ref<TarEntry[]>([])
const archiveBytes = ref<number | null>(null)
const { status, error, run, reset } = useTool<string>()
const { track } = useToolAnalytics()
const toast = useToast()

useToolSeo('tar-explorer')

onMounted(() => {
  track('tool_open', { tool: 'tar-explorer' })
})

function formatSize(size: number): string {
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

async function inspect() {
  entries.value = []
  archiveBytes.value = null
  await run(async () => {
    if (!file.value) {
      throw new Error('Choose a tar or tar.gz file before you run the tool.')
    }
    const form = new FormData()
    form.append('file', file.value)
    try {
      const data = await $fetch<{
        result: { entries: TarEntry[], bytes: number }
      }>('/api/dev/tar/list', {
        method: 'POST',
        body: form
      })
      entries.value = data.result.entries
      archiveBytes.value = data.result.bytes
      return `${data.result.entries.length} entries`
    } catch (cause) {
      const fetchError = cause as { data?: { message?: string }, statusMessage?: string }
      throw new Error(
        fetchError.data?.message || fetchError.statusMessage || 'The archive list failed.',
        { cause }
      )
    }
  })

  if (status.value === 'success') {
    track('tool_execute', { tool: 'tar-explorer' })
  } else if (status.value === 'error') {
    track('tool_error', { tool: 'tar-explorer' })
  }
}

async function downloadEntry(path: string) {
  if (!file.value) {
    return
  }
  try {
    const form = new FormData()
    form.append('file', file.value)
    form.append('path', path)
    const response = await fetch('/api/dev/tar/entry', {
      method: 'POST',
      body: form
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { message?: string, statusMessage?: string } | null
      throw new Error(payload?.message || payload?.statusMessage || 'Download failed.')
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = path.split('/').pop() || 'entry.bin'
    anchor.click()
    URL.revokeObjectURL(url)
    toast.add({ title: 'Downloaded', color: 'success' })
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Download failed.'
    toast.add({ title: message, color: 'error' })
  }
}

function handleClear() {
  file.value = null
  entries.value = []
  archiveBytes.value = null
  reset()
}

defineShortcuts({
  meta_enter: {
    usingInput: true,
    handler: () => {
      inspect()
    }
  }
})
</script>

<template>
  <ToolPage>
    <template #header>
      <ToolHeader
        title="Tar Explorer"
        description="Inspect tar and tar.gz archives in memory."
      />
    </template>

    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-server"
      title="Processed with Bun"
      description="This tool uses Bun.Archive on the server. Archives are not written to disk."
    />

    <ImageDropzone
      v-model="file"
      accept=".tar,.tar.gz,application/x-tar,application/gzip"
      prompt="Drop a .tar or .tar.gz here, or click to choose a file."
      hint="Max size 25 MB. Use .tar or .tar.gz."
    />

    <ToolActions>
      <UButton
        color="primary"
        :loading="status === 'processing'"
        @click="inspect"
      >
        Inspect
      </UButton>
      <UButton
        color="neutral"
        variant="ghost"
        @click="handleClear"
      >
        Clear
      </UButton>
    </ToolActions>

    <ToolStatus :status="status" />
    <ToolError
      v-if="error"
      :message="error"
    />

    <p
      v-if="archiveBytes != null"
      class="text-sm text-muted"
    >
      Archive size {{ formatSize(archiveBytes) }} · {{ entries.length }} files
    </p>

    <div
      v-if="entries.length"
      class="overflow-hidden rounded-md border border-default"
    >
      <table class="w-full text-left text-sm">
        <thead class="bg-elevated/60 text-xs text-muted">
          <tr>
            <th class="px-3 py-2 font-medium">
              Path
            </th>
            <th class="px-3 py-2 font-medium">
              Size
            </th>
            <th class="px-3 py-2 font-medium">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in entries"
            :key="entry.path"
            class="border-t border-default"
          >
            <td class="px-3 py-2 font-mono text-highlighted">
              {{ entry.path }}
            </td>
            <td class="px-3 py-2 text-muted">
              {{ formatSize(entry.size) }}
            </td>
            <td class="px-3 py-2">
              <UButton
                size="xs"
                color="neutral"
                variant="soft"
                @click="downloadEntry(entry.path)"
              >
                Download
              </UButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <template #docs>
      <DataToolDocs title="About tar archives">
        <p class="text-sm leading-relaxed text-muted">
          Use this tool to inspect .tar and .tar.gz files without extracting the full archive to disk.
        </p>
        <DataRelatedTools
          :items="[
            { label: 'Semver Calculator', to: '/dev/semver' },
            { label: 'Cron Visualizer', to: '/dev/cron' }
          ]"
        />
      </DataToolDocs>
    </template>
  </ToolPage>
</template>
