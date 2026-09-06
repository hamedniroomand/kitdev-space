<script setup lang="ts">
import type { TotpOptions } from '#shared/utils/crypto/totp'
import { useIntervalFn } from '@vueuse/core'
import { generateTotp, generateTotpSecret, parseTotpUri } from '#shared/utils/crypto/totp'

useToolSeo('totp')

const secretInput = ref('JBSWY3DPEHPK3PXP')
const digits = ref(6)
const period = ref(30)
const algorithm = ref<'SHA-1' | 'SHA-256' | 'SHA-512'>('SHA-1')

const code = ref('')
const remainingSeconds = ref(30)
const progress = ref(0)
const errorMessage = ref<string | null>(null)
const parsedUriDetails = ref<{ issuer?: string, label?: string } | null>(null)

const { copy, label, color, icon } = useCopyFeedback()

async function updateTotp() {
  const trimmed = secretInput.value.trim()
  if (!trimmed) {
    code.value = ''
    errorMessage.value = null
    parsedUriDetails.value = null
    return
  }

  try {
    const uriMatch = parseTotpUri(trimmed)
    if (uriMatch) {
      parsedUriDetails.value = {
        issuer: uriMatch.issuer,
        label: uriMatch.label,
      }
      if (uriMatch.digits)
        digits.value = uriMatch.digits
      if (uriMatch.period)
        period.value = uriMatch.period
      if (uriMatch.algorithm)
        algorithm.value = uriMatch.algorithm
    }
    else {
      parsedUriDetails.value = null
    }

    const options: TotpOptions = {
      digits: digits.value,
      period: period.value,
      algorithm: algorithm.value,
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

// VueUse useIntervalFn to update every 1 second
useIntervalFn(() => {
  updateTotp()
}, 1000)

watch([secretInput, digits, period, algorithm], () => {
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
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="block text-sm font-medium text-default">
            Base32 Secret or OTPAuth URI
          </label>
          <UButton
            size="xs"
            variant="subtle"
            color="neutral"
            icon="i-lucide-key-round"
            label="Generate Random Secret"
            @click="handleGenerateSecret"
          />
        </div>
        <UInput
          v-model="secretInput"
          placeholder="Paste Base32 secret key or otpauth:// URI..."
          class="font-mono text-sm w-full"
        />
      </div>

      <!-- URI Metadata info if detected -->
      <div
        v-if="parsedUriDetails"
        class="p-3 border border-default rounded-xl bg-elevated/20 flex flex-wrap gap-4 text-xs"
      >
        <div v-if="parsedUriDetails.issuer">
          <span class="text-muted">Issuer:</span>
          <span class="ml-1 font-semibold text-default">{{ parsedUriDetails.issuer }}</span>
        </div>
        <div v-if="parsedUriDetails.label">
          <span class="text-muted">Account:</span>
          <span class="ml-1 font-mono text-default">{{ parsedUriDetails.label }}</span>
        </div>
      </div>

      <!-- Error Alert -->
      <UAlert
        v-if="errorMessage"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-triangle"
        title="Invalid Secret"
        :description="errorMessage"
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
            <span>Updates in real time</span>
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
