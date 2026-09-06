<script setup lang="ts">
type OgPreviewData = {
  title: string
  description: string
  image: string
  url: string
  siteName: string
  twitterCard: string
}

const url = ref('')
const { status, error, result, run, reset } = useTool<OgPreviewData>()
const { track } = useToolAnalytics()

useToolSeo('og-preview')

onMounted(() => {
  track('tool_open', { tool: 'og-preview' })
})

async function inspect() {
  await run(async () => {
    const data = await $fetch<{ result: OgPreviewData }>('/api/network/og-preview', {
      method: 'POST',
      body: { url: url.value }
    })
    return data.result
  }, 'The OpenGraph preview failed.')

  if (status.value === 'success') {
    track('tool_execute', { tool: 'og-preview' })
  } else if (status.value === 'error') {
    track('tool_error', { tool: 'og-preview' })
  }
}

function handleClear() {
  url.value = ''
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
        title="OpenGraph Previewer"
        description="Preview how a page may look when shared on social platforms."
      />
    </template>

    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-server"
      title="Processed with Bun"
      description="This tool fetches HTML and extracts meta tags with HTMLRewriter. These cards are mock layouts, not official embeds."
    />

    <UFormField label="URL">
      <UInput
        v-model="url"
        placeholder="https://example.com"
        class="font-mono"
      />
    </UFormField>

    <ToolActions>
      <UButton
        color="primary"
        :loading="status === 'processing'"
        @click="inspect"
      >
        Preview
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

    <div
      v-if="result"
      class="grid gap-4 lg:grid-cols-2"
    >
      <OgCardMock
        variant="x"
        :title="result.title"
        :description="result.description"
        :image="result.image"
        :url="result.url"
        :site-name="result.siteName"
      />
      <OgCardMock
        variant="linkedin"
        :title="result.title"
        :description="result.description"
        :image="result.image"
        :url="result.url"
        :site-name="result.siteName"
      />
      <OgCardMock
        variant="discord"
        :title="result.title"
        :description="result.description"
        :image="result.image"
        :url="result.url"
        :site-name="result.siteName"
      />
      <OgCardMock
        variant="search"
        :title="result.title"
        :description="result.description"
        :image="result.image"
        :url="result.url"
        :site-name="result.siteName"
      />
    </div>

    <dl
      v-if="result"
      class="grid gap-3 rounded-md border border-default bg-elevated/40 p-4 sm:grid-cols-2"
    >
      <div>
        <dt class="text-xs text-muted">
          Title
        </dt>
        <dd class="text-sm text-highlighted">
          {{ result.title || '—' }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted">
          Site name
        </dt>
        <dd class="text-sm text-highlighted">
          {{ result.siteName || '—' }}
        </dd>
      </div>
      <div class="sm:col-span-2">
        <dt class="text-xs text-muted">
          Description
        </dt>
        <dd class="text-sm text-highlighted">
          {{ result.description || '—' }}
        </dd>
      </div>
      <div class="sm:col-span-2">
        <dt class="text-xs text-muted">
          Image
        </dt>
        <dd class="break-all font-mono text-xs text-highlighted">
          {{ result.image || '—' }}
        </dd>
      </div>
      <div class="sm:col-span-2">
        <dt class="text-xs text-muted">
          Canonical / og:url
        </dt>
        <dd class="break-all font-mono text-xs text-highlighted">
          {{ result.url || '—' }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted">
          Twitter card
        </dt>
        <dd class="font-mono text-xs text-highlighted">
          {{ result.twitterCard || '—' }}
        </dd>
      </div>
    </dl>

    <template #docs>
      <ToolDocs title="About Open Graph">
        <p class="text-sm leading-relaxed text-muted">
          Open Graph meta tags help apps show a title, description, and image when a link is shared.
        </p>
        <p class="text-sm leading-relaxed text-muted">
          This tool reads public HTML only. It does not take screenshots and does not copy official social UI designs.
        </p>
        <RelatedTools
          :items="[
            { label: 'HTTP Inspector', to: '/hub/network/http-inspector' }
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
