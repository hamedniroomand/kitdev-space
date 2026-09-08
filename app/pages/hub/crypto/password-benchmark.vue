<script setup lang="ts">
type PasswordAlgorithm = 'argon2id' | 'bcrypt'

const password = ref('')
const algorithm = ref<PasswordAlgorithm>('argon2id')
const memoryCost = ref(4096)
const timeCost = ref(2)
const cost = ref(10)
const verify = ref(true)
const hash = ref('')
const durationMs = ref<number | null>(null)
const verified = ref<boolean | null>(null)
const { status, error, run, reset } = useTool<string>()
const { copy, label: copyLabel, icon: copyIcon, color: copyColor } = useCopyFeedback()

const algorithmItems = [
  { label: 'Argon2id', value: 'argon2id' },
  { label: 'Bcrypt', value: 'bcrypt' },
]

useToolSeo('password-benchmark')

async function execute() {
  hash.value = ''
  durationMs.value = null
  verified.value = null

  await run(async () => {
    const data = await $fetch<{
      result: {
        hash: string
        durationMs: number
        verified?: boolean
        algorithm: PasswordAlgorithm
      }
    }>('/api/crypto/password-benchmark', {
      method: 'POST',
      body: {
        password: password.value,
        algorithm: algorithm.value,
        memoryCost: algorithm.value === 'argon2id' ? memoryCost.value : undefined,
        timeCost: algorithm.value === 'argon2id' ? timeCost.value : undefined,
        cost: algorithm.value === 'bcrypt' ? cost.value : undefined,
        verify: verify.value,
      },
    })

    hash.value = data.result.hash
    durationMs.value = data.result.durationMs
    verified.value = data.result.verified ?? null
    return data.result.hash
  }, 'The benchmark failed.')
}

async function handleCopy() {
  if (!hash.value) {
    return
  }
  await copy(hash.value)
}

function handleClear() {
  password.value = ''
  hash.value = ''
  durationMs.value = null
  verified.value = null
  reset()
}

useToolShortcuts({
  onRun: () => execute(),
  onCopy: () => handleCopy(),
})
</script>

<template>
  <ToolPage>
    <UAlert
      color="warning"
      variant="subtle"
      icon="i-lucide-shield-alert"
      title="Demo only"
      description="Do not use this tool as a password manager. Do not paste real production passwords."
    />

    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-server"
      title="Processed with Bun"
      description="This tool uses Bun.password on the server. Passwords are not stored."
    />

    <UFormField label="Password">
      <UInput
        v-model="password"
        type="password"
        autocomplete="off"
        placeholder="Enter a sample password"
      />
    </UFormField>

    <UFormField label="Algorithm">
      <USelect
        v-model="algorithm"
        :items="algorithmItems"
        class="w-full"
      />
    </UFormField>

    <div
      v-if="algorithm === 'argon2id'"
      class="grid gap-4 sm:grid-cols-2"
    >
      <UFormField label="memoryCost (max 65536)">
        <UInput
          v-model.number="memoryCost"
          type="number"
          :min="1024"
          :max="65536"
        />
      </UFormField>
      <UFormField label="timeCost (max 3)">
        <UInput
          v-model.number="timeCost"
          type="number"
          :min="1"
          :max="3"
        />
      </UFormField>
    </div>

    <UFormField
      v-else
      label="Bcrypt cost (4–12)"
    >
      <UInput
        v-model.number="cost"
        type="number"
        :min="4"
        :max="12"
      />
    </UFormField>

    <UCheckbox
      v-model="verify"
      label="Verify hash after hashing"
    />

    <ToolActions>
      <UButton
        color="primary"
        :loading="status === 'processing'"
        @click="execute"
      >
        Benchmark
      </UButton>
      <UButton
        :label="copyLabel('default', 'Copy hash')"
        :icon="copyIcon()"
        :color="copyColor()"
        variant="ghost"
        :disabled="!hash"
        @click="handleCopy"
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

    <dl
      v-if="hash"
      class="grid gap-3 rounded-md border border-default bg-elevated/40 p-4 sm:grid-cols-2"
    >
      <div>
        <dt class="text-xs text-muted">
          Duration
        </dt>
        <dd class="font-mono text-sm text-highlighted">
          {{ durationMs }} ms
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted">
          Verified
        </dt>
        <dd class="font-mono text-sm text-highlighted">
          {{ verified == null ? 'skipped' : verified ? 'true' : 'false' }}
        </dd>
      </div>
      <div class="sm:col-span-2">
        <dt class="text-xs text-muted">
          Hash
        </dt>
        <dd class="mt-1 break-all font-mono text-sm text-highlighted">
          {{ hash }}
        </dd>
      </div>
    </dl>

    <template #docs>
      <ToolDocs title="About password hashing">
        <p class="text-sm leading-relaxed text-muted">
          Use this tool to compare hash cost settings. Higher cost values take more time and memory.
        </p>
        <p class="text-sm leading-relaxed text-muted">
          Do not use MD5, SHA-1, or plain digests to store passwords.
        </p>
        <RelatedTools
          :items="[
            { label: 'Hash Generator', to: '/hub/crypto/hash-generator' },
            { label: 'ID & Secret Generator', to: '/hub/crypto/generator' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
