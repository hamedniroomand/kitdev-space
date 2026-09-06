<script setup lang="ts">
import type { ImageMetadata, MetadataGroup } from '#shared/utils/image/exif'
import { readImageMetadata } from '#shared/utils/image/exif'
import { canStripInPlace, stripImageMetadata } from '#shared/utils/image/strip'
import { formatBytes } from '#shared/utils/format'

const GROUP_ORDER: MetadataGroup[] = ['Image', 'EXIF', 'GPS', 'Text', 'XMP']

const file = ref<File | null>(null)
const meta = ref<ImageMetadata | null>(null)
const cleanedBlob = ref<Blob | null>(null)
const cleanedBytes = ref<number | null>(null)
const removedBlocks = ref<string[]>([])
const showAllTags = ref(false)

const { status, error, run, reset } = useTool<string>()
const { downloadBlob } = useDownload()

useToolSeo('image-metadata')

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

const cleanedName = computed(() => {
  const name = file.value?.name ?? 'image'
  return `clean-${name}`
})

function clearResult() {
  cleanedBlob.value = null
  cleanedBytes.value = null
  removedBlocks.value = []
}

watch(file, async (selected) => {
  meta.value = null
  showAllTags.value = false
  clearResult()
  reset()

  if (!selected) {
    return
  }

  await run(async () => {
    const bytes = new Uint8Array(await selected.arrayBuffer())
    const result = readImageMetadata(bytes)

    if (result.container === 'unknown') {
      throw new Error('This file is not a JPEG, a PNG, a WebP, or an AVIF image.')
    }

    meta.value = result
    return `${result.tags.length} tags`
  }, 'The file could not be read.')
})

async function handleStrip() {
  if (!file.value) {
    return
  }

  clearResult()

  await run(async () => {
    const bytes = new Uint8Array(await file.value!.arrayBuffer())
    const result = stripImageMetadata(bytes)

    if (!result) {
      throw new Error('This format needs a re-encode. Use the Image Converter to make a clean copy.')
    }

    // A copy keeps the blob independent of the source buffer.
    cleanedBlob.value = new Blob([result.bytes.slice()], { type: result.mime })
    cleanedBytes.value = result.bytes.byteLength
    removedBlocks.value = result.removed
    return 'cleaned'
  }, 'The metadata could not be removed.')
}

function handleDownload() {
  if (cleanedBlob.value) {
    downloadBlob(cleanedName.value, cleanedBlob.value)
  }
}

function handleClear() {
  file.value = null
  meta.value = null
  clearResult()
  reset()
}
</script>

<template>
  <ToolPage>
    <UAlert
      color="success"
      variant="subtle"
      icon="i-lucide-lock"
      title="The image stays in your browser"
      description="This tool reads and removes the metadata on your device. The file is not uploaded."
    />

    <ImageDropzone
      v-model="file"
      accept="image/jpeg,image/png,image/webp,image/avif"
      prompt="Drop a photo here, or click to choose a file."
      hint="JPEG, PNG, and WebP are cleaned in place. AVIF is read only."
    />

    <ToolError
      v-if="error"
      :message="error"
    />

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

      <ToolActions>
        <UButton
          label="Remove all metadata"
          icon="i-lucide-eraser"
          :loading="status === 'processing'"
          :disabled="!inPlace || meta.tags.length === 0"
          @click="handleStrip"
        />
        <UButton
          label="Clear"
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          @click="handleClear"
        />
      </ToolActions>

      <UAlert
        v-if="!inPlace"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="This format needs a re-encode"
        description="An AVIF file cannot be cleaned in place. Use the Image Converter to make a clean copy."
      />

      <div
        v-if="cleanedBlob"
        class="space-y-4 rounded-md border border-default bg-elevated/40 p-4"
      >
        <div class="flex items-center gap-2 text-sm font-medium text-success">
          <UIcon
            name="i-lucide-circle-check"
            class="size-5"
          />
          <span>Removed: {{ removedBlocks.join(', ') || 'nothing' }}</span>
        </div>
        <p class="text-sm text-muted">
          The pixel data did not change. Only the metadata blocks were removed.
        </p>
        <dl class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-md border border-default px-3 py-2">
            <dt class="text-xs text-muted">
              Before
            </dt>
            <dd class="font-mono text-sm text-highlighted">
              {{ formatBytes(meta.bytes) }}
            </dd>
          </div>
          <div class="rounded-md border border-default px-3 py-2">
            <dt class="text-xs text-muted">
              After
            </dt>
            <dd class="font-mono text-sm text-success">
              {{ formatBytes(cleanedBytes ?? 0) }}
            </dd>
          </div>
        </dl>
        <UButton
          label="Download the clean image"
          icon="i-lucide-download"
          @click="handleDownload"
        />
      </div>
    </template>

    <template #docs>
      <ToolDocs title="About image metadata">
        <div class="space-y-4 text-muted">
          <p>
            A camera writes EXIF data into a photo. That data can hold the GPS position, the camera model,
            the serial number, and the date. A photo that you share can give your home address.
          </p>
          <p>
            This tool reads the metadata blocks of a JPEG, a PNG, or a WebP file. It shows each tag. Then
            it removes the EXIF, the XMP, the IPTC, and the text blocks, and keeps the pixel data byte for
            byte. The image quality does not change, because there is no re-encode.
          </p>
          <p>
            Choose a file. Read the tags. Then select Remove all metadata and download the clean image.
            The file is not uploaded.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Image Studio', to: '/hub/image/studio' }
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
