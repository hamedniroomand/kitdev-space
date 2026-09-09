<script setup lang="ts">
import type { JwtClaimMatch, JwtDecodeResult, JwtVerifyStatus } from '#shared/utils/crypto/jwt'
import { formatTimeAgo, useNow } from '@vueuse/core'
import { decodeJwt, matchJwtClaim, verifyJwt } from '#shared/utils/crypto/jwt'
import { jwtSegmentHighlight } from '#shared/utils/crypto/jwt-segments'

/** A demo token and its demo secret. Both are fake and hold no real data. */
const SAMPLE = {
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vLXVzZXIiLCJuYW1lIjoiRGVtbyBVc2VyIiwiaXNzIjoiaHR0cHM6Ly9kZW1vLmtpdGRldi5zcGFjZSIsImF1ZCI6ImtpdGRldi1kZW1vIiwiaWF0IjoxNzM1Njg5NjAwLCJleHAiOjQxMDI0NDQ4MDB9.EbPcFPkJLm1CNs0_8DtfV-LF61psPczWBMqKwq00Ia0',
  secret: 'kitdev-demo-secret',
  issuer: 'https://demo.kitdev.space',
  audience: 'kitdev-demo',
}

const token = ref('')
const key = ref('')
const expectedIssuer = ref('')
const expectedAudience = ref('')
const segmentColors = jwtSegmentHighlight()
const decoded = ref<JwtDecodeResult | null>(null)
const verifyStatus = ref<JwtVerifyStatus | null>(null)
const { status, error, run, reset } = useTool()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

useToolSeo('jwt')

const issuerMatch = computed(() => matchJwtClaim(expectedIssuer.value, decoded.value?.payload.iss))
const audienceMatch = computed(() => matchJwtClaim(expectedAudience.value, decoded.value?.payload.aud))

/** One check with its own state. A check never reads the state of another check. */
interface JwtCheck {
  label: string
  value: string
  description: string
  color: 'success' | 'error' | 'highlighted'
}

function claimCheck(label: string, match: JwtClaimMatch, claim: unknown): JwtCheck {
  if (match === 'not-checked') {
    return { label, value: 'Not checked', description: 'No expected value', color: 'highlighted' }
  }
  const found = Array.isArray(claim) ? claim.join(', ') : String(claim ?? 'no claim')
  return match === 'match'
    ? { label, value: 'Match', description: found, color: 'success' }
    : { label, value: 'Mismatch', description: `Token holds ${found}`, color: 'error' }
}

function signatureCheck(): JwtCheck {
  const label = 'Signature'
  switch (verifyStatus.value) {
    case 'valid':
      return { label, value: 'Valid', description: decoded.value?.algorithm ?? '', color: 'success' }
    case 'invalid':
      return { label, value: 'Invalid', description: 'The signature does not match', color: 'error' }
    case 'unsupported':
      return { label, value: 'Not checked', description: 'Algorithm not supported', color: 'highlighted' }
    default:
      return { label, value: 'Not checked', description: 'No secret or public key', color: 'highlighted' }
  }
}

function timeCheck(): JwtCheck {
  const label = 'Time validity'
  const { expired, notBeforeValid } = decoded.value ?? {}
  if (expired == null && notBeforeValid == null) {
    return { label, value: 'Not checked', description: 'No exp or nbf claim', color: 'highlighted' }
  }
  if (expired === true) {
    return { label, value: 'Expired', description: 'The exp claim is in the past', color: 'error' }
  }
  if (notBeforeValid === false) {
    return { label, value: 'Too early', description: 'The nbf claim is in the future', color: 'error' }
  }
  return { label, value: 'Valid', description: 'Inside the exp and nbf window', color: 'success' }
}

/** `alg: none` means the token has no signature. It is never valid. */
const insecureAlgorithm = computed(() => decoded.value?.algorithm?.toLowerCase() === 'none')

const now = useNow({ interval: 1000 })
const CLAIM_NAMES = ['iat', 'nbf', 'exp'] as const
const CLAIM_TITLES: Record<string, string> = {
  iat: 'Issued at',
  nbf: 'Not before',
  exp: 'Expires at',
}

const claimDates = computed(() => CLAIM_NAMES.flatMap((name) => {
  const seconds = decoded.value?.payload[name]
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) {
    return []
  }
  const date = new Date(seconds * 1000)
  return [{
    name,
    title: CLAIM_TITLES[name]!,
    iso: date.toISOString(),
    relative: formatTimeAgo(date, undefined, now.value.getTime()),
  }]
}))

const checks = computed<JwtCheck[]>(() => [
  signatureCheck(),
  timeCheck(),
  claimCheck('Issuer', issuerMatch.value, decoded.value?.payload.iss),
  claimCheck('Audience', audienceMatch.value, decoded.value?.payload.aud),
])

async function handleDecode() {
  verifyStatus.value = null
  await run(async () => {
    decoded.value = decodeJwt(token.value)
    verifyStatus.value = await verifyJwt(token.value, key.value)
    return decoded.value.payloadJson
  })
}

const { applySample } = useSampleInput(token, { demo: SAMPLE.token })

async function handleLoadSample() {
  applySample('demo')
  key.value = SAMPLE.secret
  expectedIssuer.value = SAMPLE.issuer
  expectedAudience.value = SAMPLE.audience
  await handleDecode()
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
  expectedIssuer.value = ''
  expectedAudience.value = ''
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
      :extensions="segmentColors"
    />

    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      <span><span class="text-primary font-medium">Header</span> . <span class="text-success font-medium">Payload</span> . <span class="text-warning font-medium">Signature</span></span>
      <span>The editor colors each part of the token.</span>
    </div>

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

    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField
        label="Expected issuer (iss)"
        hint="Optional"
      >
        <UInput
          v-model="expectedIssuer"
          placeholder="https://issuer.example.com"
          class="font-mono text-sm w-full"
        />
      </UFormField>
      <UFormField
        label="Expected audience (aud)"
        hint="Optional"
      >
        <UInput
          v-model="expectedAudience"
          placeholder="my-api"
          class="font-mono text-sm w-full"
        />
      </UFormField>
    </div>

    <ToolActions>
      <UButton
        label="Load Sample"
        color="neutral"
        variant="ghost"
        icon="i-lucide-file-text"
        @click="handleLoadSample"
      />
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
      </div>

      <UAlert
        v-if="insecureAlgorithm"
        color="error"
        variant="subtle"
        icon="i-lucide-shield-alert"
        title="Insecure algorithm: alg is none"
        description="A token with alg none carries no signature. The signature check fails. Never accept such a token."
      />

      <div class="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard
          v-for="check in checks"
          :key="check.label"
          :label="check.label"
          :value="check.value"
          :description="check.description"
          :color="check.color"
          :aria-label="`${check.label} check`"
        />
      </div>

      <div
        v-if="claimDates.length"
        aria-label="Claim dates"
        class="p-3.5 border border-default rounded-xl bg-elevated/40 space-y-1.5"
      >
        <div
          v-for="claim in claimDates"
          :key="claim.name"
          class="flex flex-wrap items-baseline gap-x-2 text-sm"
        >
          <span class="text-highlighted font-medium w-24">{{ claim.title }}</span>
          <code class="text-muted">{{ claim.name }}</code>
          <span class="font-mono text-highlighted">{{ claim.iso }}</span>
          <span class="text-muted">({{ claim.relative }})</span>
        </div>
      </div>

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
          <p>
            Give an expected issuer or an expected audience to check the <code>iss</code> and <code>aud</code> claims. An empty field is not checked. The <code>aud</code> claim can hold one value or a list, and a match on one entry of the list counts as a match.
          </p>
          <p>
            Each check has its own card. The signature, the time claims, the issuer, and the audience pass or fail on their own. A card shows "Not checked" when the tool has no data for that check.
          </p>
          <p>
            The <code>iat</code>, <code>nbf</code>, and <code>exp</code> claims hold Unix seconds. The tool shows each one as an ISO date and as a relative time. The relative time updates every second.
          </p>
          <p>
            An <code>alg</code> of <code>none</code> gets an urgent warning. Such a token has no signature, so the signature check fails.
          </p>
          <p>
            "Load Sample" fills the tool with a demo token, a demo secret, and the demo issuer and audience. The sample data is fake. Do not use the demo secret for a real token.
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
