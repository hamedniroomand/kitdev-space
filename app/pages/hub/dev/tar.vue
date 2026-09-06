<script setup lang="ts">
import type { TarEntry } from '#shared/utils/dev/tar'
import { listTarEntries, readTarEntry } from '#shared/utils/dev/tar'
import { formatBytes } from '#shared/utils/format'

const file = ref<File | null>(null)
const entries = ref<TarEntry[]>([])
const archiveBytes = ref<number | null>(null)
// The archive is read once and kept, so a download needs no second read.
const archive = shallowRef<Uint8Array | null>(null)
const { status, error, run, reset } = useTool<string>()
const { downloadBlob } = useDownload()
const toast = useToast()

useToolSeo('tar-explorer')

const fileCount = computed(() => entries.value.filter(entry => entry.type === 'file').length)

watch(file, () => {
  entries.value = []
  archiveBytes.value = null
  archive.value = null
  reset()
})

async function inspect() {
  entries.value = []
  archiveBytes.value = null

  await run(async () => {
    if (!file.value) {
      throw new Error('Choose a tar or tar.gz file before you run the tool.')
    }

    const bytes = new Uint8Array(await file.value.arrayBuffer())
    entries.value = listTarEntries(bytes)
    archive.value = bytes
    archiveBytes.value = bytes.byteLength
    return `${entries.value.length} entries`
  }, 'The archive list failed.')
}

function downloadEntry(path: string) {
  if (!archive.value) {
    return
  }

  try {
    const content = readTarEntry(archive.value, path)
    downloadBlob(path.split('/').pop() || 'entry.bin', new Blob([content.slice()]))
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
  archive.value = null
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
    <UAlert
      color="success"
      variant="subtle"
      icon="i-lucide-lock"
      title="The archive stays in your browser"
      description="This tool reads the archive on your device. The file is not uploaded."
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

    <ToolError
      v-if="error"
      :message="error"
    />

    <p
      v-if="archiveBytes != null"
      class="text-sm text-muted"
    >
      Archive size {{ formatBytes(archiveBytes) }} · {{ fileCount }} files · {{ entries.length }} entries
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
              {{ entry.type === 'directory' ? '—' : formatBytes(entry.size) }}
            </td>
            <td class="px-3 py-2">
              <UButton
                v-if="entry.type === 'file'"
                size="xs"
                color="neutral"
                variant="soft"
                @click="downloadEntry(entry.path)"
              >
                Download
              </UButton>
              <span
                v-else
                class="text-muted"
              >{{ entry.type }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <template #docs>
      <ToolDocs title="About tar archives">
        <div class="space-y-4 text-muted">
          <p>
            Use this tool to look in a .tar or .tar.gz file without extraction. It lists each entry
            with the path, the type, and the size. You can download one entry.
          </p>
          <p>
            The tool reads the archive in your browser. It removes the gzip layer, then walks the
            512-byte header blocks. It reads the long path forms of GNU tar and of bsdtar, so a deep
            path is correct.
          </p>
          <p>
            Choose a file of 25 MB or smaller. Then select Inspect.
          </p>
        </div>
        <RelatedTools
          :items="[
            { label: 'Semver Calculator', to: '/hub/dev/semver' },
            { label: 'Cron Visualizer', to: '/hub/dev/cron' }
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
