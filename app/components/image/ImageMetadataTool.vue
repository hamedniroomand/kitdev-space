<script setup lang="ts">
import type { ImageMetadata, MetadataGroup } from '#shared/utils/image/exif'
import { formatBytes } from '#shared/utils/format'
import { readImageMetadata } from '#shared/utils/image/exif'
import { readImageResponse } from '#shared/utils/image/response'
import { canStripInPlace, stripImageMetadata } from '#shared/utils/image/strip'
import { readMetadata } from '~/utils/image/metadata-read'

/**
 * Reads the metadata of an image and removes it. Two paths remove it: the
 * browser path edits the file byte for byte, and the server path re-encodes
 * the image with Bun. The page states which path a button uses.
 */
const props = defineProps<{
  /** The registry id of the page. A variant page gives its own id. */
  toolId: string
}>()

const GROUP_ORDER: MetadataGroup[] = ['Image', 'EXIF', 'GPS', 'Text', 'XMP']

const EXTENSION_FOR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

interface CleanResult {
  blob: Blob
  bytes: number
  removed: string[]
  /** Blocks that the strip kept on purpose, such as the orientation marker. */
  kept: string[]
  path: 'browser' | 'server'
  /** Tags that the browser parser still finds in the result. Null when it cannot read the format. */
  remainingTags: number | null
  name: string
}

const EXIF_ITEMS = [
  { label: 'All EXIF', value: 'all' as const },
  { label: 'GPS only', value: 'gps' as const },
]

const file = ref<File | null>(null)
const meta = ref<ImageMetadata | null>(null)
/** True when the file is set but the browser parser does not know the container. */
const unreadable = ref(false)
const cleaned = ref<CleanResult | null>(null)
const showAllTags = ref(false)
const stripExif = ref<'all' | 'gps'>('all')
const stripXmp = ref(true)
const stripIptc = ref(true)
const stripComments = ref(true)

const { status, error, run, reset } = useTool<string>()
const { downloadBlob, downloadText } = useDownload()

useToolSeo(props.toolId)

const container = computed(() => meta.value?.container ?? 'unknown')
const inPlace = computed(() => canStripInPlace(container.value))
const privateTags = computed(() => meta.value?.tags.filter(item => item.private) ?? [])
const visibleTags = computed(() => {
  const tags = meta.value?.tags ?? []
  const list = showAllTags.value ? tags : privateTags.value
  return [...list].sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group))
})

const mapLink = computed(() => {
  const gps = meta.value?.gps
  return gps ? `https://www.openstreetmap.org/?mlat=${gps.latitude}&mlon=${gps.longitude}#map=16/${gps.latitude}/${gps.longitude}` : null
})

const baseName = computed(() => (file.value?.name ?? 'image').replace(/\.[^.]+$/, ''))

watch(file, async (selected) => {
  meta.value = null
  unreadable.value = false
  showAllTags.value = false
  cleaned.value = null
  reset()

  if (!selected) {
    return
  }

  await run(async () => {
    const bytes = new Uint8Array(await selected.arrayBuffer())
    const result = await readMetadata(bytes)

    if (result.container === 'unknown') {
      // The server path can still clean the file, so this is not an error.
      unreadable.value = true
      return 'unreadable'
    }

    meta.value = result
    return `${result.tags.length} tags`
  }, 'The file could not be read.')
})

async function handleStrip() {
  if (!file.value) {
    return
  }

  cleaned.value = null

  await run(async () => {
    const bytes = new Uint8Array(await file.value!.arrayBuffer())
    const result = stripImageMetadata(bytes, {
      exif: stripExif.value,
      xmp: stripXmp.value,
      iptc: stripIptc.value,
      comments: stripComments.value,
      keepOrientation: true,
    })

    if (!result) {
      throw new Error('This format has no in-browser path. Use the server option.')
    }

    // A copy keeps the blob independent of the source buffer.
    const copy = result.bytes.slice()
    cleaned.value = {
      blob: new Blob([copy], { type: result.mime }),
      bytes: copy.byteLength,
      removed: result.removed,
      kept: result.kept,
      path: 'browser',
      remainingTags: readImageMetadata(copy).tags.length,
      name: `clean-${file.value!.name}`,
    }
    return 'cleaned'
  }, 'The metadata could not be removed.', { runLocation: 'browser', option: stripExif.value })
}

async function handleServerClean() {
  if (!file.value) {
    return
  }

  cleaned.value = null

  await run(async () => {
    const form = new FormData()
    form.append('file', file.value!, file.value!.name)

    const response = await fetch('/api/image/clean', { method: 'POST', body: form })
    const result = await readImageResponse(response, 'The server could not clean the image.', file.value!.size)

    // The browser checks the result, so the user does not have to trust the server.
    const bytes = new Uint8Array(await result.blob.arrayBuffer())
    const check = readImageMetadata(bytes)
    const extension = EXTENSION_FOR_MIME[result.blob.type] ?? 'png'

    cleaned.value = {
      blob: result.blob,
      bytes: result.outputBytes,
      removed: meta.value?.blocks.length ? meta.value.blocks : ['every metadata block'],
      kept: [],
      path: 'server',
      remainingTags: check.container === 'unknown' ? null : check.tags.length,
      name: `clean-${baseName.value}.${extension}`,
    }
    return 'cleaned'
  }, 'The server could not clean the image.', { runLocation: 'server' })
}

function handleDownload() {
  if (cleaned.value) {
    downloadBlob(cleaned.value.name, cleaned.value.blob)
  }
}

function handleReport() {
  if (!meta.value || !file.value) {
    return
  }
  const report = {
    file: file.value.name,
    container: meta.value.container,
    width: meta.value.width,
    height: meta.value.height,
    bytes: meta.value.bytes,
    gps: meta.value.gps,
    blocks: meta.value.blocks,
    tags: meta.value.tags,
  }
  downloadText(`${baseName.value}-metadata.json`, JSON.stringify(report, null, 2))
}

function handleClear() {
  file.value = null
  meta.value = null
  unreadable.value = false
  cleaned.value = null
  reset()
}
</script>

<template>
  <ToolPage>
    <UAlert
      color="success"
      variant="subtle"
      icon="i-lucide-lock"
      title="The image stays in your browser by default"
      description="The tool reads the tags and removes them on your device. Only the button marked as the server option sends the file anywhere."
    />

    <ImageDropzone
      v-model="file"
      prompt="Drop a photo here, or click to choose a file."
      hint="JPEG, PNG, and WebP are cleaned in place in the browser. Every other format uses the server option."
    />

    <ToolError
      v-if="error"
      :message="error"
    />

    <template v-if="unreadable && file">
      <UAlert
        color="warning"
        variant="subtle"
        icon="i-lucide-file-question"
        title="The browser cannot read this format"
        description="The server option can still remove the metadata. Bun re-encodes the image in memory and does not store the file."
      />
      <ToolActions>
        <UButton
          label="Remove on the server"
          icon="i-lucide-server"
          :loading="status === 'processing'"
          @click="handleServerClean"
        />
        <UButton
          label="Clear"
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          @click="handleClear"
        />
      </ToolActions>
    </template>

    <template v-if="meta">
      <dl class="grid gap-3 rounded-md border border-default bg-elevated/40 p-4 sm:grid-cols-4">
        <div>
          <dt class="text-xs text-muted">
            Format
          </dt>
          <dd class="font-mono text-sm uppercase text-highlighted">
            {{ meta.container }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-muted">
            Size
          </dt>
          <dd class="font-mono text-sm text-highlighted">
            {{ meta.width ?? '—' }} × {{ meta.height ?? '—' }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-muted">
            Bytes
          </dt>
          <dd class="font-mono text-sm text-highlighted">
            {{ formatBytes(meta.bytes) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-muted">
            Metadata blocks
          </dt>
          <dd class="font-mono text-sm text-highlighted">
            {{ meta.blocks.join(', ') || 'none' }}
          </dd>
        </div>
      </dl>

      <UAlert
        v-if="meta.gps"
        color="error"
        variant="subtle"
        icon="i-lucide-map-pin"
        title="This photo holds a GPS position"
      >
        <template #description>
          <span class="font-mono">{{ meta.gps.latitude }}, {{ meta.gps.longitude }}</span>
          <ULink
            v-if="mapLink"
            :to="mapLink"
            target="_blank"
            rel="noopener noreferrer"
            class="ml-2 underline"
          >
            Open the map
          </ULink>
        </template>
      </UAlert>

      <UAlert
        v-else-if="meta.container === 'gif'"
        color="neutral"
        variant="subtle"
        icon="i-lucide-info"
        title="The browser does not parse GIF metadata"
        description="Use the server option to clean this image."
      />

      <UAlert
        v-else-if="meta.tags.length === 0"
        color="success"
        variant="subtle"
        icon="i-lucide-shield-check"
        title="No metadata found"
        description="This image holds no EXIF tag, no GPS position, and no text block."
      />

      <section
        v-if="meta.tags.length"
        class="space-y-3"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-sm font-medium text-highlighted">
            {{ visibleTags.length }} of {{ meta.tags.length }} tags
          </h2>
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            :icon="showAllTags ? 'i-lucide-eye-off' : 'i-lucide-eye'"
            :label="showAllTags ? 'Show private tags only' : 'Show all tags'"
            @click="showAllTags = !showAllTags"
          />
        </div>

        <div class="overflow-x-auto rounded-md border border-default">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-default">
                <th class="px-3 py-2 text-left font-medium text-highlighted">
                  Group
                </th>
                <th class="px-3 py-2 text-left font-medium text-highlighted">
                  Tag
                </th>
                <th class="px-3 py-2 text-left font-medium text-highlighted">
                  Value
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr
                v-for="(row, index) in visibleTags"
                :key="`${row.group}-${row.name}-${index}`"
              >
                <td class="px-3 py-2">
                  <UBadge
                    :color="row.private ? 'warning' : 'neutral'"
                    variant="subtle"
                  >
                    {{ row.group }}
                  </UBadge>
                </td>
                <td class="px-3 py-2 font-mono text-highlighted">
                  {{ row.name }}
                </td>
                <td class="break-all px-3 py-2 font-mono text-muted">
                  {{ row.value }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section
        v-if="inPlace"
        class="space-y-3 rounded-md border border-default p-4"
      >
        <h2 class="text-sm font-medium text-highlighted">
          Blocks to remove
        </h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <UFormField
            label="EXIF tags"
            hint="GPS only keeps the camera settings."
          >
            <USelect
              v-model="stripExif"
              :items="EXIF_ITEMS"
              class="w-full"
            />
          </UFormField>
          <UFormField label="XMP packet">
            <USwitch v-model="stripXmp" />
          </UFormField>
          <UFormField label="IPTC block">
            <USwitch v-model="stripIptc" />
          </UFormField>
          <UFormField label="Comments and text">
            <USwitch v-model="stripComments" />
          </UFormField>
        </div>
        <p class="text-xs text-muted">
          The browser option always keeps the ICC color profile and the orientation marker, so the
          image keeps its color and its rotation. These choices apply to the browser option only.
        </p>
      </section>

      <ToolActions>
        <UButton
          label="Remove in the browser"
          icon="i-lucide-eraser"
          :loading="status === 'processing'"
          :disabled="!inPlace || meta.tags.length === 0"
          @click="handleStrip"
        />
        <UButton
          label="Remove on the server"
          color="neutral"
          variant="subtle"
          icon="i-lucide-server"
          :loading="status === 'processing'"
          @click="handleServerClean"
        />
        <UButton
          v-if="meta.tags.length"
          label="Download the report"
          color="neutral"
          variant="ghost"
          icon="i-lucide-file-json"
          @click="handleReport"
        />
        <UButton
          label="Clear"
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          @click="handleClear"
        />
      </ToolActions>

      <p class="text-xs text-muted">
        The browser option removes the metadata blocks and keeps every pixel byte for byte. The server
        option sends the file to Bun, which re-encodes the image and writes no metadata. The file is
        processed in memory and is not stored. A JPEG loses a little quality in a re-encode. A PNG and
        a WebP do not.
      </p>

      <UAlert
        v-if="!inPlace"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="This format has no in-browser path"
        description="Use the server option. It re-encodes the image and removes every metadata block."
      />
    </template>

    <div
      v-if="cleaned && file"
      class="space-y-4 rounded-md border border-default bg-elevated/40 p-4"
    >
      <div class="flex items-center gap-2 text-sm font-medium text-success">
        <UIcon
          name="i-lucide-circle-check"
          class="size-5"
        />
        <span>Removed {{ cleaned.path === 'server' ? 'on the server' : 'in your browser' }}: {{ cleaned.removed.join(', ') || 'nothing' }}</span>
      </div>
      <p
        v-if="cleaned.path === 'browser'"
        class="text-sm text-muted"
      >
        The pixel data did not change. Only the metadata blocks were removed.
        <template v-if="cleaned.kept.length">
          The tool kept {{ cleaned.kept.join(', ') }}, so the image keeps its rotation and its color.
        </template>
      </p>
      <p
        v-else
        class="text-sm text-muted"
      >
        The image was re-encoded.
        <template v-if="cleaned.remainingTags !== null">
          Your browser checked the result: {{ cleaned.remainingTags }} tags remain.
        </template>
      </p>
      <dl class="grid gap-3 sm:grid-cols-2">
        <div class="rounded-md border border-default px-3 py-2">
          <dt class="text-xs text-muted">
            Before
          </dt>
          <dd class="font-mono text-sm text-highlighted">
            {{ formatBytes(file.size) }}
          </dd>
        </div>
        <div class="rounded-md border border-default px-3 py-2">
          <dt class="text-xs text-muted">
            After
          </dt>
          <dd class="font-mono text-sm text-success">
            {{ formatBytes(cleaned.bytes) }}
          </dd>
        </div>
      </dl>
      <UButton
        label="Download the clean image"
        icon="i-lucide-download"
        @click="handleDownload"
      />
    </div>

    <template #docs>
      <slot name="docs" />
    </template>
  </ToolPage>
</template>
