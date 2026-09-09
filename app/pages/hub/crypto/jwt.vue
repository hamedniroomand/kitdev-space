<script setup lang="ts">
import type { JwtDecodeResult, JwtVerifyStatus } from '#shared/utils/crypto/jwt'
import { decodeJwt, verifyJwt } from '#shared/utils/crypto/jwt'

const token = ref('')
const key = ref('')
const decoded = ref<JwtDecodeResult | null>(null)
const verifyStatus = ref<JwtVerifyStatus | null>(null)
const { status, error, run, reset } = useTool()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

useToolSeo('jwt')

const verifyLabel = computed(() => {
  switch (verifyStatus.value) {
    case 'valid':
      return 'Signature is valid.'
    case 'invalid':
      return 'Signature is not valid.'
    case 'unsupported':
      return 'This algorithm has no browser signature check.'
    case 'missing-key':
      return 'Enter a secret or a public key to verify the signature.'
    default:
      return null
  }
})

const verifyColor = computed(() => {
  if (verifyStatus.value === 'valid') {
    return 'success'
  }
  if (verifyStatus.value === 'invalid') {
    return 'error'
  }
  return 'warning'
})

async function handleDecode() {
  verifyStatus.value = null
  await run(async () => {
    decoded.value = decodeJwt(token.value)
    verifyStatus.value = await verifyJwt(token.value, key.value)
    return decoded.value.payloadJson
  })
}

async function handleCopy(text: string, key: 'header' | 'payload') {
  if (!text) {
    return
  }
  await copy(text, key)
}

function handleClear() {
  token.value = ''
  key.value = ''
  decoded.value = null
  verifyStatus.value = null
  reset()
}

useToolShortcuts({
  onRun: () => handleDecode(),
})
</script>

<template>
  <ToolPage>
    <UAlert
      color="neutral"
      variant="subtle"
      title="Processed locally"
      description="This tool runs in the browser. Do not paste production secrets into shared machines."
    />

    <LazyToolEditor
      v-model="token"
      hydrate-on-idle
      label="JWT"
      placeholder="Paste a JWT here"
    />

    <UFormField
      label="Secret or public key"
      hint="Optional"
      description="Give the shared secret for HS256, HS384, and HS512. Give a PEM or a JWK public key for RS256, RS384, and RS512."
    >
      <UTextarea
        v-model="key"
        :rows="3"
        placeholder="HMAC secret, PEM public key, or JWK"
        class="font-mono text-sm w-full"
      />
    </UFormField>

    <ToolActions>
      <UButton
        label="Decode"
        icon="i-lucide-scan-search"
        :loading="status === 'processing'"
        @click="handleDecode"
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

    <div
      v-if="decoded"
      class="space-y-4"
    >
      <div class="flex flex-wrap gap-2">
        <UBadge
          v-if="decoded.algorithm"
          color="neutral"
          variant="subtle"
        >
          alg: {{ decoded.algorithm }}
        </UBadge>
        <UBadge
          v-if="decoded.expired === true"
          color="error"
          variant="subtle"
        >
          Expired
        </UBadge>
        <UBadge
          v-else-if="decoded.expired === false"
          color="success"
          variant="subtle"
        >
          Not expired
        </UBadge>
        <UBadge
          v-if="decoded.notBeforeValid === false"
          color="warning"
          variant="subtle"
        >
          Not valid yet (nbf)
        </UBadge>
      </div>

      <UAlert
        v-if="verifyLabel"
        :color="verifyColor"
        variant="subtle"
        :title="verifyLabel"
      />

      <div class="grid gap-4 lg:grid-cols-2">
        <div class="space-y-2">
          <div class="flex justify-end">
            <UButton
              size="sm"
              variant="ghost"
              :label="copyLabel('header', 'Copy header')"
              :icon="copyIcon('header')"
              :color="copyColor('header')"
              @click="handleCopy(decoded.headerJson, 'header')"
            />
          </div>
          <LazyToolEditor
            hydrate-on-idle
            :model-value="decoded.headerJson"
            label="Header"
            readonly
            lang="json"
          />
        </div>
        <div class="space-y-2">
          <div class="flex justify-end">
            <UButton
              size="sm"
              variant="ghost"
              :label="copyLabel('payload', 'Copy payload')"
              :icon="copyIcon('payload')"
              :color="copyColor('payload')"
              @click="handleCopy(decoded.payloadJson, 'payload')"
            />
          </div>
          <LazyToolEditor
            hydrate-on-idle
            :model-value="decoded.payloadJson"
            label="Payload"
            readonly
            lang="json"
          />
        </div>
      </div>
    </div>

    <template #docs>
      <ToolDocs title="About JWT debugging">
        <div class="space-y-4 text-muted">
          <p>
            The tool parses Base64URL header and payload data and formats them as JSON.
          </p>
          <p>
            Expiration uses the <code>exp</code> claim. Signature checks use Web Crypto. HS256, HS384, and HS512 need the shared secret. RS256, RS384, and RS512 need the public key in PEM or JWK form.
          </p>
          <p>
            The tool does not download a public key. Paste the key that you want to use.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Encoder & Escaper', to: '/hub/dev/encoder' },
            { label: 'Hash Generator', to: '/hub/crypto/hash-generator' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
