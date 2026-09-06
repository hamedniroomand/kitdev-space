<script setup lang="ts">
import type { IpInfo } from '#shared/utils/network/ip-info'

useToolSeo('ip-info')

interface ExtendedIpInfo extends IpInfo {
  clientIp?: string
}

const inputIp = ref('')
const errorMsg = ref<string | null>(null)
const loading = ref(false)
const info = ref<ExtendedIpInfo | null>(null)

const { copy } = useCopyFeedback()

const presets = [
  { label: 'Cloudflare DNS', ip: '1.1.1.1' },
  { label: 'Google DNS', ip: '8.8.8.8' },
  { label: 'Localhost IPv4', ip: '127.0.0.1' },
  { label: 'Localhost IPv6', ip: '::1' }
]

async function fetchInfo(targetIp?: string) {
  loading.value = true
  errorMsg.value = null

  try {
    const url = targetIp ? `/api/network/ip-info?ip=${encodeURIComponent(targetIp)}` : '/api/network/ip-info'
    const res = await $fetch<ExtendedIpInfo>(url)
    info.value = res
    if (!targetIp && res.ip) {
      inputIp.value = res.ip
    }
  } catch (err: unknown) {
    const fetchErr = err as { data?: { message?: string }, message?: string }
    errorMsg.value = fetchErr.data?.message || fetchErr.message || 'Failed to fetch IP details.'
  } finally {
    loading.value = false
  }
}

function handleLookup() {
  if (inputIp.value.trim()) {
    fetchInfo(inputIp.value.trim())
  } else {
    fetchInfo()
  }
}

function handleMyIp() {
  inputIp.value = ''
  fetchInfo()
}

function handlePreset(ip: string) {
  inputIp.value = ip
  fetchInfo(ip)
}

// Initial fetch on mount
fetchInfo()
</script>

<template>
  <ToolPage>
    <div class="space-y-6">
      <!-- Search & Presets Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <div class="flex flex-wrap items-center gap-2">
          <UButton
            size="xs"
            variant="solid"
            color="primary"
            icon="i-lucide-globe"
            label="My IP"
            @click="handleMyIp"
          />
          <span class="text-xs text-muted font-medium ml-2">Presets:</span>
          <UButton
            v-for="p in presets"
            :key="p.ip"
            size="xs"
            variant="ghost"
            color="neutral"
            :label="p.label"
            @click="handlePreset(p.ip)"
          />
        </div>
      </div>

      <!-- Input Form -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div class="flex-1">
          <UInput
            v-model="inputIp"
            placeholder="Enter IPv4 or IPv6 address (leave blank for your IP)..."
            class="font-mono text-sm w-full"
            @keydown.enter="handleLookup"
          />
        </div>
        <UButton
          label="Lookup IP"
          color="neutral"
          variant="solid"
          icon="i-lucide-search"
          :loading="loading"
          @click="handleLookup"
        />
      </div>

      <!-- Error Alert -->
      <UAlert
        v-if="errorMsg"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-triangle"
        title="Lookup Error"
        :description="errorMsg"
      />

      <!-- Results Grid -->
      <div
        v-if="info"
        class="space-y-6"
      >
        <!-- Highlights -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="p-4 border border-default rounded-xl bg-elevated/40 text-center">
            <div class="text-xs text-muted">
              IP Version
            </div>
            <div class="text-2xl font-bold font-mono mt-1 text-primary">
              IPv{{ info.version }}
            </div>
          </div>

          <div class="p-4 border border-default rounded-xl bg-elevated/40 text-center">
            <div class="text-xs text-muted">
              Address Scope
            </div>
            <div
              class="text-2xl font-bold font-mono mt-1 capitalize"
              :class="info.type === 'public' ? 'text-success' : 'text-warning'"
            >
              {{ info.type }}
            </div>
          </div>

          <div class="p-4 border border-default rounded-xl bg-elevated/40 text-center">
            <div class="text-xs text-muted">
              Special Address
            </div>
            <div class="text-2xl font-bold font-mono mt-1">
              {{ info.isSpecial ? 'Yes' : 'No' }}
            </div>
          </div>

          <div class="p-4 border border-default rounded-xl bg-elevated/40 text-center">
            <div class="text-xs text-muted">
              Reverse DNS
            </div>
            <div
              class="text-sm font-semibold font-mono mt-2 truncate text-default"
              :title="info.hostname || 'None'"
            >
              {{ info.hostname || 'No PTR record' }}
            </div>
          </div>
        </div>

        <!-- Details Table -->
        <div class="border border-default rounded-xl overflow-hidden">
          <div class="p-3 border-b border-default bg-elevated/40 font-medium text-sm">
            Address Formats & Values
          </div>
          <table class="w-full text-left text-sm border-collapse">
            <tbody class="divide-y divide-default">
              <tr class="hover:bg-elevated/20">
                <td class="p-3 font-medium text-muted w-1/3">
                  IP Address
                </td>
                <td class="p-3 font-mono font-bold text-default">
                  {{ info.ip }}
                </td>
                <td class="p-3 text-right">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-copy"
                    @click="copy(info.ip)"
                  />
                </td>
              </tr>
              <tr
                v-if="info.hostname"
                class="hover:bg-elevated/20"
              >
                <td class="p-3 font-medium text-muted">
                  Hostname (PTR)
                </td>
                <td class="p-3 font-mono text-default">
                  {{ info.hostname }}
                </td>
                <td class="p-3 text-right">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-copy"
                    @click="copy(info.hostname)"
                  />
                </td>
              </tr>
              <tr
                v-if="info.decimal"
                class="hover:bg-elevated/20"
              >
                <td class="p-3 font-medium text-muted">
                  Decimal (Integer)
                </td>
                <td class="p-3 font-mono text-default">
                  {{ info.decimal }}
                </td>
                <td class="p-3 text-right">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-copy"
                    @click="copy(info.decimal)"
                  />
                </td>
              </tr>
              <tr
                v-if="info.hex"
                class="hover:bg-elevated/20"
              >
                <td class="p-3 font-medium text-muted">
                  Hexadecimal
                </td>
                <td class="p-3 font-mono text-default">
                  {{ info.hex }}
                </td>
                <td class="p-3 text-right">
                  <UButton
                    size="xs"
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-copy"
                    @click="copy(info.hex)"
                  />
                </td>
              </tr>
              <tr
                v-if="info.binary"
                class="hover:bg-elevated/20"
              >
                <td class="p-3 font-medium text-muted">
                  Binary Representation
                </td>
                <td
                  class="p-3 font-mono text-xs text-muted"
                  colspan="2"
                >
                  {{ info.binary }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </ToolPage>
</template>
