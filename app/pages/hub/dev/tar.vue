<script setup lang="ts">
import type { Archive, EntryPreview, TarEntry, TarTreeNode } from '#shared/utils/dev/tar'
import { refDebounced, useObjectUrl } from '@vueuse/core'
import { buildPathTree, openArchive, packEntries, previewFor } from '#shared/utils/dev/tar'
import { formatBytes } from '#shared/utils/format'

const file = ref<File | null>(null)
const archive = shallowRef<Archive | null>(null)
const archiveBytes = ref<number | null>(null)
const query = ref('')
const search = refDebounced(query, 200)
const selected = ref<string[]>([])
const previewEntry = shallowRef<TarEntry | null>(null)
const previewText = ref('')
const previewImage = shallowRef<Uint8Array | null>(null)

const { status, error, run, reset } = useTool<string>()
const { downloadBlob } = useDownload()
const toast = useToast()

useToolSeo('tar-explorer')

// Inflated bytes stay here, so a second read of the same entry needs no second inflate.
const cache = new Map<string, Uint8Array>()

const entries = computed(() => archive.value?.entries ?? [])
const files = computed(() => entries.value.filter(entry => entry.type === 'file'))

const matches = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) {
    return entries.value
  }
  return entries.value.filter(entry => entry.path.toLowerCase().includes(term))
})

const tree = computed(() => buildPathTree(matches.value))
const sizes = computed(() => new Map(files.value.map(entry => [entry.path, entry.size])))
const selectedBytes = computed(() => selected.value.reduce(
  (sum, path) => sum + (sizes.value.get(path) ?? 0),
  0,
))

const preview = computed<EntryPreview>(() => previewEntry.value
  ? previewFor(previewEntry.value.path, previewEntry.value.size)
  : { kind: 'none' })

const previewLang = computed(() => preview.value.kind === 'text' ? preview.value.lang : 'text')

const previewBlob = computed(() => {
  if (preview.value.kind !== 'image' || !previewImage.value) {
    return undefined
  }
  return new Blob([previewImage.value.slice()], { type: preview.value.mime })
})

// `useObjectUrl` revokes the old URL on every change and on unmount.
const previewUrl = useObjectUrl(previewBlob)

function clearResult() {
  archive.value = null
  archiveBytes.value = null
  selected.value = []
  previewEntry.value = null
  previewText.value = ''
  previewImage.value = null
  cache.clear()
}

watch(file, () => {
  clearResult()
  reset()
})

function notify(cause: unknown, fallback: string) {
  toast.add({ title: cause instanceof Error ? cause.message : fallback, color: 'error' })
}

function readEntry(path: string): Uint8Array {
  const hit = cache.get(path)
  if (hit) {
    return hit
  }

  const bytes = archive.value!.read(path)
  cache.set(path, bytes)
  return bytes
}

async function inspect() {
  clearResult()

  await run(async () => {
    if (!file.value) {
      throw new Error('Choose an archive file before you run the tool.')
    }

    const bytes = new Uint8Array(await file.value.arrayBuffer())
    archive.value = openArchive(bytes)
    archiveBytes.value = bytes.byteLength
    return `${entries.value.length} entries`
  }, 'The archive list failed.')
}

function handleSelect(path: string) {
  selected.value = selected.value.includes(path)
    ? selected.value.filter(item => item !== path)
    : [...selected.value, path]
}

function selectAll() {
  selected.value = matches.value.filter(entry => entry.type === 'file').map(entry => entry.path)
}

function handlePreview(node: TarTreeNode) {
  previewEntry.value = { path: node.path, size: node.size, type: node.type }
  previewText.value = ''
  previewImage.value = null

  if (preview.value.kind === 'none') {
    return
  }

  try {
    const bytes = readEntry(node.path)
    if (preview.value.kind === 'text') {
      previewText.value = new TextDecoder().decode(bytes)
    }
    else {
      previewImage.value = bytes
    }
  }
  catch (cause) {
    notify(cause, 'The preview failed.')
  }
}

function downloadEntry(path: string) {
  try {
    downloadBlob(path.split('/').pop() || 'entry.bin', new Blob([readEntry(path).slice()]))
    toast.add({ title: 'Downloaded', color: 'success' })
  }
  catch (cause) {
    notify(cause, 'The download failed.')
  }
}

function downloadSelection() {
  try {
    const picked: Record<string, Uint8Array> = {}
    for (const path of selected.value) {
      picked[path] = readEntry(path)
    }

    const zip = packEntries(picked)
    downloadBlob('extracted.zip', new Blob([zip.slice()], { type: 'application/zip' }))
    toast.add({ title: 'Downloaded', color: 'success' })
  }
  catch (cause) {
    notify(cause, 'The download failed.')
  }
}

function handleClear() {
  file.value = null
  query.value = ''
  clearResult()
  reset()
}

useToolShortcuts({
  onRun: () => inspect(),
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
      accept=".tar,.tar.gz,.tgz,.zip,.bz2,.xz,application/x-tar,application/gzip,application/zip"
      prompt="Drop a .tar, .tgz, or .zip here, or click to choose a file."
      hint="Max size 25 MB. Use .tar, .tar.gz, .tgz, or .zip."
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
      Archive size {{ formatBytes(archiveBytes) }} · {{ files.length }} files ·
      {{ entries.length }} entries
    </p>

    <template v-if="entries.length">
      <UFormField
        label="Search paths"
        help="The tree shows the paths that hold this text."
      >
        <UInput
          v-model="query"
          icon="i-lucide-search"
          placeholder="src/index.ts"
          class="w-full sm:w-80"
        />
      </UFormField>

      <ToolActions>
        <span class="self-center text-sm text-muted">
          {{ selected.length }} selected · {{ formatBytes(selectedBytes) }}
        </span>
        <UButton
          size="xs"
          color="neutral"
          variant="subtle"
          @click="selectAll"
        >
          Select all
        </UButton>
        <UButton
          size="xs"
          color="neutral"
          variant="subtle"
          :disabled="!selected.length"
          @click="selected = []"
        >
          Clear selection
        </UButton>
        <UButton
          size="xs"
          color="primary"
          icon="i-lucide-file-archive"
          :disabled="!selected.length"
          @click="downloadSelection"
        >
          Download zip
        </UButton>
      </ToolActions>

      <div class="rounded-md border border-default p-2">
        <p
          v-if="!tree.length"
          class="px-2 py-1 text-sm text-muted"
        >
          No path holds this text.
        </p>
        <TarTreeNode
          v-for="node in tree"
          :key="node.path"
          :node="node"
          :selected="selected"
          :active-path="previewEntry?.path ?? null"
          @select="handleSelect"
          @preview="handlePreview"
          @download="downloadEntry"
        />
      </div>
    </template>

    <template v-if="previewEntry">
      <p class="font-mono text-sm text-highlighted">
        {{ previewEntry.path }}
      </p>

      <LazyToolEditor
        v-if="preview.kind === 'text'"
        v-model="previewText"
        hydrate-on-idle
        label="Preview"
        readonly
        :lang="previewLang"
      />

      <img
        v-else-if="preview.kind === 'image' && previewUrl"
        :src="previewUrl"
        :alt="`Preview of ${previewEntry.path}`"
        class="max-h-96 rounded-md border border-default bg-elevated/40 object-contain"
      >

      <p
        v-else
        class="text-sm text-muted"
      >
        This entry has no preview. Download it to open it. The tool previews text and images of
        less than 1 MB.
      </p>
    </template>

    <template #docs>
      <ToolDocs title="About archive files">
        <div class="space-y-4 text-muted">
          <p>
            Use this tool to look in a .tar, .tar.gz, .tgz, or .zip file without extraction. It
            lists each entry with the path, the type, and the size. Search the paths, open a
            preview, and download one entry or a zip of many.
          </p>
          <p>
            The tool reads the archive in your browser. It removes the gzip layer, then walks the
            512-byte header blocks. It reads the long path forms of GNU tar and of bsdtar, so a
            deep path is correct. A zip file uses its central directory, so an entry stays packed
            until you ask for it.
          </p>
          <p>
            bzip2 and xz need a decoder that the browser does not have. The tool reports
            "Unsupported compression format" for such a file.
          </p>
          <p>
            Choose a file of 25 MB or smaller. Then select Inspect.
          </p>
        </div>
        <RelatedTools
          :items="[
            { label: 'Semver Calculator', to: '/hub/dev/semver' },
            { label: 'Cron Visualizer', to: '/hub/dev/cron' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
