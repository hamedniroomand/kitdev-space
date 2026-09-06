<script setup lang="ts">
import type { QrPayloadKind } from '#shared/utils/dev/qrcode'
import { buildQrPayload, generateQrSvg } from '#shared/utils/dev/qrcode'

definePageMeta({
  ssr: false,
})

const kind = ref<QrPayloadKind>('url')
const text = ref('https://kitdev.space')
const ssid = ref('HomeNet')
const password = ref('')
const security = ref<'WPA' | 'WEP' | 'nopass'>('WPA')
const hidden = ref(false)
const svg = ref('')
const previewUrl = computed(() => {
  if (!svg.value) {
    return null
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.value)}`
})
const { status, error, run, reset } = useTool<string>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()
const { downloadText } = useDownload()

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

useToolSeo('qr-code')

async function generate() {
  await run(() => {
    const payload = buildQrPayload(
      kind.value,
      text.value,
      kind.value === 'wifi'
        ? {
            ssid: ssid.value,
            password: password.value,
            security: security.value,
            hidden: hidden.value,
          }
        : undefined,
    )
    svg.value = generateQrSvg(payload)
    return svg.value
  })
}

async function handleCopy() {
  if (!svg.value) {
    return
  }
  await copy(svg.value)
}

function handleDownload() {
  if (!svg.value) {
    return
  }
  downloadText('qr-code.svg', svg.value, 'image/svg+xml')
}

function handleClear() {
  svg.value = ''
  reset()
}

defineShortcuts({
  meta_enter: {
    usingInput: true,
    handler: () => {
      generate()
    },
  },
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

    <ToolActions>
      <UButton
        label="Generate"
        icon="i-lucide-qr-code"
        :loading="status === 'processing'"
        @click="generate"
      />
      <UButton
        :label="copyLabel('default', 'Copy SVG')"
        :color="copyColor()"
        variant="subtle"
        :icon="copyIcon()"
        :disabled="!svg"
        @click="handleCopy"
      />
      <UButton
        label="Download SVG"
        color="neutral"
        variant="subtle"
        icon="i-lucide-download"
        :disabled="!svg"
        @click="handleDownload"
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
            The tool builds an SVG QR code in the browser with uqr and lets you download the file.
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
