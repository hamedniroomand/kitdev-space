<script setup lang="ts">
import type { QrEcc, QrPayloadKind } from '#shared/utils/dev/qrcode'
import { refDebounced } from '@vueuse/core'
import {
  buildQrPayload,
  QR_MAX_QUIET_ZONE,
  qrPngFilename,
  qrPngLayout,
  qrQuietZone,
  renderQr,
} from '#shared/utils/dev/qrcode'

const PREVIEW_DELAY = 200

const kind = ref<QrPayloadKind>('url')
const text = ref('https://kitdev.space')
const ssid = ref('HomeNet')
const password = ref('')
const security = ref<'WPA' | 'WEP' | 'nopass'>('WPA')
const hidden = ref(false)

const ecc = useToolOption<QrEcc>('ecc', 'M')
const quietZone = useToolOption('quiet-zone', 4)
const pngPixels = useToolOption('png-pixels', 1024)

const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const { downloadBlob, downloadText } = useDownload()

const kindItems = [
  { label: 'URL', value: 'url' },
  { label: 'Plain text', value: 'text' },
  { label: 'Wi-Fi', value: 'wifi' },
]

const securityItems = [
  { label: 'WPA / WPA2', value: 'WPA' },
  { label: 'WEP', value: 'WEP' },
  { label: 'Open', value: 'nopass' },
]

const eccItems = [
  { label: 'L — 7% recovery', value: 'L' },
  { label: 'M — 15% recovery', value: 'M' },
  { label: 'Q — 25% recovery', value: 'Q' },
  { label: 'H — 30% recovery', value: 'H' },
]

const pngItems = [256, 512, 1024, 2048].map(pixels => ({ label: `${pixels} px`, value: pixels }))

useToolSeo('qr-code')

// The preview waits 200 ms after the last keystroke. A control change applies at once.
const typed = computed(() => ({
  kind: kind.value,
  text: text.value,
  ssid: ssid.value,
  password: password.value,
  security: security.value,
  hidden: hidden.value,
}))
const settled = refDebounced(typed, PREVIEW_DELAY)

function encode(values: typeof typed.value) {
  if (!(values.kind === 'wifi' ? values.ssid.trim() : values.text.trim())) {
    return null
  }
  const payload = buildQrPayload(
    values.kind,
    values.text,
    values.kind === 'wifi'
      ? {
          ssid: values.ssid,
          password: values.password,
          security: values.security,
          hidden: values.hidden,
        }
      : undefined,
  )
  return renderQr(payload, { ecc: ecc.value, border: quietZone.value })
}

const { error, result: code } = useLiveTool(
  () => encode(settled.value),
  { runLocation: 'browser', option: () => ecc.value },
)

/**
 * A copy or a download must give what the user typed, not the debounced
 * preview. Inside the 200 ms window the two differ.
 */
function currentCode() {
  return encode(typed.value)
}

const previewUrl = computed(() => {
  const svg = code.value?.svg
  return svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : null
})

const downloadError = ref<string | null>(null)
const errorMessage = computed(() => error.value ?? downloadError.value)
const noQuietZone = computed(() => qrQuietZone(quietZone.value) === 0)

async function handleCopy() {
  const svg = currentCode()?.svg
  if (svg) {
    await copy(svg)
  }
}

function handleDownloadSvg() {
  const svg = currentCode()?.svg
  if (svg) {
    downloadText('qr-code.svg', svg, 'image/svg+xml')
  }
}

async function handleDownloadPng() {
  downloadError.value = null
  try {
    const matrix = currentCode()?.matrix
    if (!matrix?.length) {
      return
    }
    if (typeof OffscreenCanvas === 'undefined') {
      throw new Error('This browser cannot render a PNG. Download the SVG instead.')
    }
    const pixels = pngPixels.value
    const { moduleSize, offset } = qrPngLayout(matrix.length, pixels)
    const canvas = new OffscreenCanvas(pixels, pixels)
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('This browser cannot render a PNG. Download the SVG instead.')
    }
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, pixels, pixels)
    context.fillStyle = '#000000'
    // Each module covers whole pixels, so the PNG stays sharp at every size.
    matrix.forEach((row, rowIndex) => {
      row.forEach((module, colIndex) => {
        if (module) {
          context.fillRect(
            offset + colIndex * moduleSize,
            offset + rowIndex * moduleSize,
            moduleSize,
            moduleSize,
          )
        }
      })
    })
    downloadBlob(qrPngFilename(pixels), await canvas.convertToBlob({ type: 'image/png' }))
  }
  catch (cause) {
    downloadError.value = cause instanceof Error ? cause.message : 'The PNG download failed.'
  }
}

function handleClear() {
  text.value = ''
  ssid.value = ''
  password.value = ''
  downloadError.value = null
}

useToolShortcuts({
  onCopy: () => handleCopy(),
})
</script>

<template>
  <ToolPage>
    <UAlert
      color="neutral"
      variant="subtle"
      title="Processed locally"
      description="This tool runs in the browser."
    />

    <UFormField label="Type">
      <USelect
        v-model="kind"
        :items="kindItems"
        class="w-48"
      />
    </UFormField>

    <LazyToolEditor
      v-if="kind !== 'wifi'"
      v-model="text"
      hydrate-on-idle
      :label="kind === 'url' ? 'URL' : 'Text'"
      :placeholder="kind === 'url' ? 'https://example.com' : 'Paste text here'"
    />

    <div
      v-else
      class="grid gap-4 sm:grid-cols-2"
    >
      <UFormField label="Network name (SSID)">
        <UInput
          v-model="ssid"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Security">
        <USelect
          v-model="security"
          :items="securityItems"
          class="w-full"
        />
      </UFormField>
      <UFormField
        v-if="security !== 'nopass'"
        label="Password"
      >
        <UInput
          v-model="password"
          type="password"
          class="w-full"
        />
      </UFormField>
      <UFormField label="Hidden network">
        <USwitch v-model="hidden" />
      </UFormField>
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <UFormField label="Error correction">
        <USelect
          v-model="ecc"
          :items="eccItems"
          class="w-full"
        />
      </UFormField>
      <UFormField
        label="Quiet zone (modules)"
        :description="`0 to ${QR_MAX_QUIET_ZONE} modules`"
      >
        <UInput
          v-model.number="quietZone"
          type="number"
          :min="0"
          :max="QR_MAX_QUIET_ZONE"
          class="w-full font-mono"
        />
      </UFormField>
      <UFormField label="PNG size">
        <USelect
          v-model="pngPixels"
          :items="pngItems"
          class="w-full"
        />
      </UFormField>
    </div>

    <UAlert
      v-if="noQuietZone"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="Scanners can miss this code"
      description="A code with no quiet zone is hard to read, above all at error correction level L. Use a margin of 4 modules."
    />

    <ToolActions>
      <UButton
        label="Download PNG"
        icon="i-lucide-download"
        :disabled="!code"
        @click="handleDownloadPng"
      />
      <UButton
        label="Download SVG"
        color="neutral"
        variant="subtle"
        icon="i-lucide-download"
        :disabled="!code"
        @click="handleDownloadSvg"
      />
      <UButton
        :label="copyLabel('default', 'Copy SVG')"
        :color="copyColor()"
        variant="subtle"
        :icon="copyIcon()"
        :disabled="!code"
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
      v-if="errorMessage"
      :message="errorMessage"
    />

    <img
      v-if="previewUrl"
      :src="previewUrl"
      alt="QR code preview"
      class="max-w-xs rounded-md border border-default bg-elevated/40 p-4"
    >

    <template #docs>
      <ToolDocs title="About QR codes">
        <div class="space-y-4 text-muted">
          <p>
            The tool builds the QR code in the browser with uqr. The preview updates 200 ms after
            you stop typing.
          </p>
          <p>
            The PNG download uses one whole pixel block for each module, from 256 px up to 2048 px.
            The file name holds the resolution, such as <code>qrcode-1024.png</code>.
          </p>
          <p>
            A higher error correction level repairs more damage but holds less data. The quiet zone
            is the white margin that a scanner needs around the code.
          </p>
          <p>
            Wi-Fi codes use the standard WIFI: payload format.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'URL Inspector', to: '/hub/network/url-inspector' },
            { label: 'Lorem Ipsum & Mock Data', to: '/hub/data/lorem' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
