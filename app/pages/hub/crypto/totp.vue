<script setup lang="ts">
import type { TotpAlgorithm, TotpOptions } from '#shared/utils/crypto/totp'
import { useIntervalFn } from '@vueuse/core'
import { buildTotpUri, generateTotp, generateTotpSecret, parseTotpUri, TOTP_ALGORITHMS } from '#shared/utils/crypto/totp'

useToolSeo('totp')

const secretInput = ref('JBSWY3DPEHPK3PXP')
const digits = ref(6)
const period = ref(30)
const algorithm = ref<TotpAlgorithm>('SHA-1')

const issuer = ref('KitDev')
const account = ref('admin@example.com')
/** Empty means "use the clock of this device". A value freezes the clock for a repeatable test. */
const fixedTime = ref('')

const code = ref('')
const remainingSeconds = ref(30)
const progress = ref(0)
const errorMessage = ref<string | null>(null)

const { copy, label, color, icon } = useCopyFeedback()

const frozenMs = computed(() => {
  if (!fixedTime.value) {
    return null
  }
  const parsed = Date.parse(fixedTime.value)
  return Number.isNaN(parsed) ? null : parsed
})

const base32Secret = computed(() => {
  const trimmed = secretInput.value.trim()
  return parseTotpUri(trimmed)?.secret ?? trimmed
})

const totpUri = computed(() => {
  if (!base32Secret.value) {
    return ''
  }
  return buildTotpUri({
    secret: base32Secret.value,
    account: account.value.trim(),
    issuer: issuer.value.trim() || undefined,
    digits: digits.value,
    period: period.value,
    algorithm: algorithm.value,
  })
})

async function updateTotp() {
  const trimmed = secretInput.value.trim()
  if (!trimmed) {
    code.value = ''
    errorMessage.value = null
    return
  }

  try {
    const options: TotpOptions = {
      digits: digits.value,
      period: period.value,
      algorithm: algorithm.value,
      ...(frozenMs.value === null ? {} : { time: frozenMs.value }),
    }

    const res = await generateTotp(trimmed, options)
    code.value = res.code
    remainingSeconds.value = res.remainingSeconds
    progress.value = res.progress
    errorMessage.value = null
  }
  catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Invalid Base32 secret.'
    code.value = ''
  }
}

watch(secretInput, (newVal) => {
  const uriMatch = parseTotpUri(newVal.trim())
  if (!uriMatch) {
    return
  }
  if (uriMatch.digits)
    digits.value = uriMatch.digits
  if (uriMatch.period)
    period.value = uriMatch.period
  if (uriMatch.algorithm)
    algorithm.value = uriMatch.algorithm
  if (uriMatch.issuer)
    issuer.value = uriMatch.issuer
  if (uriMatch.label)
    account.value = uriMatch.label.split(':').pop() ?? uriMatch.label
}, { immediate: true })

// VueUse useIntervalFn to update every 1 second
const { pause, resume } = useIntervalFn(() => {
  updateTotp()
}, 1000)

// A frozen clock must not tick, or the countdown moves under a fixed time.
watch(frozenMs, (value) => {
  if (value === null) {
    resume()
  }
  else {
    pause()
  }
})

watch([secretInput, digits, period, algorithm, fixedTime], () => {
  updateTotp()
})

onMounted(() => {
  updateTotp()
})

function handleGenerateSecret() {
  secretInput.value = generateTotpSecret(20)
}

function handleCopy() {
  if (code.value) {
    copy(code.value)
  }
}

function handleClear() {
  secretInput.value = ''
  code.value = ''
  errorMessage.value = null
}
</script>

<template>
  <ToolPage>
    <div class="space-y-6">
      <!-- Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <div class="flex flex-wrap items-center gap-3">
          <!-- Digits -->
          <div class="flex items-center gap-1">
            <span class="text-xs text-muted font-medium">Digits:</span>
            <UButton
              size="xs"
              :variant="digits === 6 ? 'solid' : 'ghost'"
              :color="digits === 6 ? 'primary' : 'neutral'"
              label="6 Digits"
              @click="digits = 6"
            />
            <UButton
              size="xs"
              :variant="digits === 8 ? 'solid' : 'ghost'"
              :color="digits === 8 ? 'primary' : 'neutral'"
              label="8 Digits"
              @click="digits = 8"
            />
          </div>

          <!-- Period -->
          <div class="flex items-center gap-1 border-s border-default ps-3">
            <span class="text-xs text-muted font-medium">Step:</span>
            <UButton
              size="xs"
              :variant="period === 30 ? 'solid' : 'ghost'"
              :color="period === 30 ? 'primary' : 'neutral'"
              label="30s"
              @click="period = 30"
            />
            <UButton
              size="xs"
              :variant="period === 60 ? 'solid' : 'ghost'"
              :color="period === 60 ? 'primary' : 'neutral'"
              label="60s"
              @click="period = 60"
            />
          </div>

          <!-- Algorithm -->
          <div class="flex items-center gap-2 border-s border-default ps-3">
            <span class="text-xs text-muted font-medium">Algorithm:</span>
            <USelect
              v-model="algorithm"
              :items="TOTP_ALGORITHMS"
              size="xs"
              aria-label="Hash algorithm"
              class="w-28"
            />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <UButton
            label="Clear"
            icon="i-lucide-eraser"
            size="xs"
            color="neutral"
            variant="ghost"
            :disabled="!secretInput"
            @click="handleClear"
          />
        </div>
      </div>

      <!-- Secret Input -->
      <UFormField label="Base32 Secret or OTPAuth URI">
        <template #hint>
          <UButton
            size="xs"
            variant="subtle"
            color="neutral"
            icon="i-lucide-key-round"
            label="Generate Random Secret"
            @click="handleGenerateSecret"
          />
        </template>
        <UInput
          v-model="secretInput"
          placeholder="Paste Base32 secret key or otpauth:// URI..."
          class="font-mono text-sm w-full"
        />
      </UFormField>

      <!-- URI fields and the fixed test time -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <UFormField label="Issuer">
          <UInput
            v-model="issuer"
            placeholder="KitDev"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Account">
          <UInput
            v-model="account"
            placeholder="admin@example.com"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Fixed test time"
          help="Set a time to freeze the clock. Leave it empty to follow this device."
        >
          <div class="flex items-center gap-2">
            <UInput
              v-model="fixedTime"
              type="datetime-local"
              step="1"
              class="w-full"
            />
            <UButton
              icon="i-lucide-timer-reset"
              size="sm"
              color="neutral"
              variant="ghost"
              aria-label="Follow the clock of this device"
              :disabled="!fixedTime"
              @click="fixedTime = ''"
            />
          </div>
        </UFormField>
      </div>

      <!-- otpauth URI -->
      <UFormField
        v-if="totpUri"
        label="otpauth URI"
      >
        <template #hint>
          <UButton
            :label="label('uri')"
            :color="color('uri')"
            :icon="icon('uri')"
            size="xs"
            variant="subtle"
            @click="copy(totpUri, 'uri', 'field')"
          />
        </template>
        <p class="break-all rounded-md border border-default bg-elevated/40 p-3 font-mono text-xs text-highlighted">
          {{ totpUri }}
        </p>
      </UFormField>

      <!-- Error Alert -->
      <ToolError
        v-if="errorMessage"
        :message="errorMessage"
      />

      <!-- Active TOTP Code Card -->
      <div
        v-if="code"
        class="p-6 border border-default rounded-2xl bg-elevated/40 text-center space-y-4 max-w-md mx-auto"
      >
        <div class="text-xs font-medium text-muted uppercase tracking-wider">
          Current One-Time Password
        </div>

        <div
          aria-label="One-time password"
          class="text-4xl sm:text-5xl font-extrabold font-mono tracking-widest text-primary flex items-center justify-center gap-3"
        >
          <span>{{ code.slice(0, Math.ceil(code.length / 2)) }}</span>
          <span>{{ code.slice(Math.ceil(code.length / 2)) }}</span>
        </div>

        <!-- Progress bar and timer -->
        <div class="space-y-1.5 pt-2">
          <div class="w-full bg-default rounded-full h-2 overflow-hidden border border-default">
            <div
              class="h-full bg-primary transition-all duration-300 ease-linear rounded-full"
              :style="{ width: `${progress}%` }"
            />
          </div>
          <div class="flex justify-between items-center text-xs text-muted">
            <span>{{ frozenMs === null ? 'Updates in real time' : 'The clock is frozen' }}</span>
            <span
              class="font-mono font-semibold"
              :class="remainingSeconds <= 5 ? 'text-error' : 'text-default'"
            >
              {{ remainingSeconds }}s remaining
            </span>
          </div>
        </div>

        <div class="pt-2">
          <UButton
            :label="label()"
            :color="color()"
            :icon="icon()"
            size="md"
            variant="solid"
            @click="handleCopy"
          />
        </div>
      </div>
    </div>

    <template #docs>
      <ToolDocs title="About TOTP">
        <div class="space-y-4 text-muted">
          <p>
            TOTP makes the six-digit code of a two-factor app. It combines a shared secret with the current time, so the code changes every 30 seconds.
          </p>
          <p>
            Give a Base32 secret or a full otpauth:// URI. The tool shows the current code and the seconds until the next code. Use it to test a login flow or to check that your server and your app agree.
          </p>
          <p>
            Set a fixed test time to freeze the clock. The tool then gives the same code each time, so you can repeat a test. Clear the field to follow the clock of this device again.
          </p>
          <p>
            The tool also shows the otpauth URI for the current settings. Copy the URI and give it to an authenticator app or to a test script. The tool builds the URI in the browser and sends the secret to no other host.
          </p>
          <p>
            The tool supports SHA-1, SHA-256, and SHA-512. SHA-1 is the default, because almost every authenticator app uses it. Change the algorithm only when your server asks for a different one.
          </p>
          <p>
            The clock of the server and the clock of the device must agree. Most of the failures of TOTP come from a clock that has drifted, and not from a wrong secret. Do not put a real production secret into any web tool.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'HMAC Generator', to: '/hub/crypto/hmac' },
            { label: 'ID & Secret Generator', to: '/hub/crypto/generator' },
            { label: 'Encoder & Escaper', to: '/hub/dev/encoder' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
