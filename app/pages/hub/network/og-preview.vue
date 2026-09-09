<script setup lang="ts">
import type { OgImageProbe, OgPreviewData } from '#shared/utils/network/og-meta'
import {
  auditOgData,
  buildMetaTagSnippet,
  canExtractOgInBrowser,
  extractOgInBrowser,
} from '#shared/utils/network/og-meta'

interface OgPreviewResult extends Partial<OgPreviewData> {
  charset?: string
  imageCheck?: OgImageProbe | null
}

type Mode = 'url' | 'html'

const MODE_ITEMS: { label: string, value: Mode, icon: string }[] = [
  { label: 'Fetch URL', value: 'url', icon: 'i-lucide-globe' },
  { label: 'Paste HTML', value: 'html', icon: 'i-lucide-code' },
]

const CARD_VARIANTS = ['x', 'linkedin', 'discord', 'search'] as const

const UA_ITEMS = [
  { label: 'Standard browser', value: 'browser' },
  { label: 'facebookexternalhit', value: 'facebook' },
  { label: 'Twitterbot', value: 'twitter' },
  { label: 'LinkedInBot', value: 'linkedin' },
]

const mode = ref<Mode>('url')
const url = ref('')
const html = ref('')
const options = reactive({ ua: 'browser' })

const { status, error, result, run, reset } = useTool<OgPreviewResult>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

useToolSeo('og-preview')
const { reportInput } = useToolInput()

const data = computed<OgPreviewData | null>(() => {
  const value = result.value
  if (!value) {
    return null
  }
  return {
    title: value.title ?? '',
    description: value.description ?? '',
    image: value.image ?? '',
    imageAlt: value.imageAlt ?? '',
    url: value.url ?? '',
    canonical: value.canonical ?? '',
    siteName: value.siteName ?? '',
    type: value.type ?? '',
    twitterCard: value.twitterCard ?? '',
  }
})

const findings = computed(() => (data.value ? auditOgData(data.value, result.value?.imageCheck) : []))
const problemCount = computed(() => findings.value.filter(item => item.level === 'error' || item.level === 'warning').length)
const snippet = computed(() => (data.value ? buildMetaTagSnippet(data.value, findings.value) : ''))
const imageCheck = computed(() => result.value?.imageCheck ?? null)

async function inspect() {
  if (mode.value === 'html') {
    await run(() => {
      if (!canExtractOgInBrowser()) {
        throw new Error('This browser cannot read HTML.')
      }
      if (!html.value.trim()) {
        throw new Error('Paste the HTML of the page.')
      }
      return { ...extractOgInBrowser(html.value, url.value), imageCheck: null }
    }, 'The HTML did not parse.', { runLocation: 'browser' })
    return
  }

  reportInput('url')
  await run(async () => {
    const response = await $fetch<{ result: OgPreviewResult }>('/api/network/og-preview', {
      method: 'POST',
      body: { url: url.value, userAgent: options.ua },
    })
    return response.result
  }, 'The OpenGraph preview failed.', { runLocation: 'server', option: options.ua })
}

async function copySnippet() {
  if (!snippet.value) {
    return
  }
  await copy(snippet.value, 'meta-tags', 'snippet')
}

function handleClear() {
  url.value = ''
  html.value = ''
  reset()
}

useToolShortcuts({
  onRun: () => inspect(),
})
</script>

<template>
  <ToolPage>
    <UAlert
      v-if="mode === 'html'"
      color="success"
      variant="subtle"
      icon="i-lucide-lock"
      title="The pasted HTML stays in your browser"
      description="This mode reads the meta tags with DOMParser on your device. The HTML is not sent to the server."
    />
    <UAlert
      v-else
      color="info"
      variant="subtle"
      icon="i-lucide-server"
      title="Processed with Bun"
      description="This mode sends the URL to the server. Bun fetches the page and the image, then reads the meta tags. These cards are mock layouts, not official embeds."
    />

    <UTabs
      v-model="mode"
      :items="MODE_ITEMS"
      :content="false"
    />

    <div class="flex flex-wrap gap-4">
      <UFormField
        :label="mode === 'url' ? 'URL' : 'Page URL (optional)'"
        :description="mode === 'url' ? undefined : 'The tool uses this URL to resolve a relative image path.'"
        class="min-w-56 flex-1"
      >
        <UInput
          v-model="url"
          placeholder="https://example.com"
          class="w-full font-mono"
        />
      </UFormField>
      <UFormField
        v-if="mode === 'url'"
        label="User-Agent"
        description="Some sites return other tags to a social bot."
        class="min-w-56"
      >
        <USelect
          v-model="options.ua"
          :items="UA_ITEMS"
          class="w-full"
        />
      </UFormField>
    </div>

    <LazyToolEditor
      v-if="mode === 'html'"
      v-model="html"
      hydrate-on-idle
      label="HTML"
      lang="html"
      placeholder="<html><head><meta property=&quot;og:title&quot; content=&quot;...&quot;></head></html>"
      :rows="10"
    />

    <ToolActions>
      <UButton
        color="primary"
        :loading="status === 'processing'"
        @click="inspect"
      >
        Preview
      </UButton>
      <ToolResultActions
        :result="result"
        :input="mode === 'url' ? url : ''"
        tool-id="og-preview"
        filename="og-preview.json"
        :options="options"
      />
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

    <div
      v-if="data"
      class="grid gap-4 lg:grid-cols-2"
    >
      <OgCardMock
        v-for="variant in CARD_VARIANTS"
        :key="variant"
        :variant="variant"
        :title="data.title"
        :description="data.description"
        :image="data.image"
        :url="data.url"
        :site-name="data.siteName"
      />
    </div>

    <section
      v-if="data"
      class="space-y-3"
    >
      <div class="flex flex-wrap items-center gap-3">
        <h2 class="text-sm font-medium text-highlighted">
          Tag checklist
        </h2>
        <UBadge
          :color="problemCount === 0 ? 'success' : 'warning'"
          variant="subtle"
        >
          {{ problemCount }} item{{ problemCount === 1 ? '' : 's' }} to correct
        </UBadge>
      </div>
      <OgTagChecklist :findings="findings" />
    </section>

    <section
      v-if="data"
      class="space-y-3"
    >
      <div class="flex flex-wrap items-center gap-3">
        <h2 class="text-sm font-medium text-highlighted">
          Corrected meta tags
        </h2>
        <UButton
          size="xs"
          variant="subtle"
          :color="copyColor('meta-tags')"
          :icon="copyIcon('meta-tags')"
          @click="copySnippet"
        >
          {{ copyLabel('meta-tags', 'Copy corrected meta tags') }}
        </UButton>
      </div>
      <p class="text-sm text-muted">
        A correct tag keeps its value. Only a missing or an incorrect tag gets a placeholder.
      </p>
      <pre class="overflow-x-auto rounded-md border border-default bg-elevated/40 p-3 font-mono text-xs text-highlighted">{{ snippet }}</pre>
    </section>

    <dl
      v-if="data"
      class="grid gap-3 rounded-md border border-default bg-elevated/40 p-4 sm:grid-cols-2"
    >
      <div>
        <dt class="text-xs text-muted">
          Title
        </dt>
        <dd class="text-sm text-highlighted">
          {{ data.title || '—' }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted">
          Site name
        </dt>
        <dd class="text-sm text-highlighted">
          {{ data.siteName || '—' }}
        </dd>
      </div>
      <div class="sm:col-span-2">
        <dt class="text-xs text-muted">
          Description
        </dt>
        <dd class="text-sm text-highlighted">
          {{ data.description || '—' }}
        </dd>
      </div>
      <div class="sm:col-span-2">
        <dt class="text-xs text-muted">
          Image
        </dt>
        <dd class="break-all font-mono text-xs text-highlighted">
          {{ data.image || '—' }}
        </dd>
      </div>
      <div class="sm:col-span-2">
        <dt class="text-xs text-muted">
          Canonical / og:url
        </dt>
        <dd class="break-all font-mono text-xs text-highlighted">
          {{ data.canonical || data.url || '—' }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted">
          Twitter card
        </dt>
        <dd class="font-mono text-xs text-highlighted">
          {{ data.twitterCard || '—' }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted">
          Image file
        </dt>
        <dd class="font-mono text-xs text-highlighted">
          <template v-if="imageCheck && imageCheck.ok">
            {{ imageCheck.contentType || 'unknown type' }} ·
            {{ imageCheck.byteSize ?? '?' }} bytes ·
            {{ imageCheck.width ?? '?' }} x {{ imageCheck.height ?? '?' }} pixels
          </template>
          <template v-else-if="imageCheck">
            {{ imageCheck.error || 'The image check failed.' }}
          </template>
          <template v-else>
            Not checked
          </template>
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted">
          Character set
        </dt>
        <dd class="font-mono text-xs text-highlighted">
          {{ result?.charset || '—' }}
        </dd>
      </div>
    </dl>

    <template #docs>
      <ToolDocs title="About Open Graph">
        <p class="text-sm leading-relaxed text-muted">
          Open Graph meta tags help apps show a title, description, and image when a link is shared.
        </p>
        <p class="text-sm leading-relaxed text-muted">
          The checklist compares the tags with the platform rules. It reads the length of the title
          and the description. It also downloads the image and reads the content type, the byte
          size, and the pixel size. Use 1200 x 630 pixels for the best result.
        </p>
        <p class="text-sm leading-relaxed text-muted">
          The paste mode runs fully in your browser. The HTML that you paste does not leave the
          browser, so you can test a draft page before you publish it. The browser cannot download
          an image from another host, so the image checks run in the URL mode only.
        </p>
        <p class="text-sm leading-relaxed text-muted">
          The User-Agent selector shows the page that a social bot receives. Use it to find
          prerendered tags. Do not use it to pass a paywall or a site protection.
        </p>
        <p class="text-sm leading-relaxed text-muted">
          This tool reads public HTML only. It does not take screenshots and does not copy official
          social UI designs. A platform can change its layout at any time.
        </p>
        <RelatedTools
          :items="[
            { label: 'HTTP Inspector', to: '/hub/network/http-inspector' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
