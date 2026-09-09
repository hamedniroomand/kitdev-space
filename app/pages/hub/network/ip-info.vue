<script setup lang="ts">
import type { IpInfo } from '#shared/utils/network/ip-info'

useToolSeo('ip-info')
const { reportInput } = useToolInput()

interface ExtendedIpInfo extends IpInfo {
  clientIp?: string
}

// The address goes in the query string, so a share link can carry it. It holds
// only the address that the user typed. The address of the user never goes in
// the URL.
const params = reactive({ ip: '' })
useToolQuery({ options: params })

const { status, error, result: info, run } = useTool<ExtendedIpInfo>()

const { copy } = useCopyFeedback()

const presets = [
  { label: 'Cloudflare DNS', ip: '1.1.1.1' },
  { label: 'Google DNS', ip: '8.8.8.8' },
  { label: 'Localhost IPv4', ip: '127.0.0.1' },
  { label: 'Localhost IPv6', ip: '::1' },
]

const scopeEvidence = computed(() => {
  if (!info.value) {
    return null
  }
  if (!info.value.matchedRange) {
    return 'Global unicast. No special-purpose range holds this address.'
  }
  return `${info.value.matchedRange} (${info.value.rfc})`
})

const cidrLink = computed(() => `/hub/network/cidr?ip=${encodeURIComponent(info.value?.ip ?? '')}`)
const rdapLink = computed(() => `/hub/network/rdap-lookup?query=${encodeURIComponent(info.value?.ip ?? '')}`)

async function fetchInfo(targetIp?: string) {
  reportInput('url')
  await run(async () => {
    const url = targetIp ? `/api/network/ip-info?ip=${encodeURIComponent(targetIp)}` : '/api/network/ip-info'
    return await $fetch<ExtendedIpInfo>(url)
  }, 'Failed to fetch IP details.')
}

function handleLookup() {
  fetchInfo(params.ip.trim() || undefined)
}

function handleMyIp() {
  params.ip = ''
  fetchInfo()
}

function handlePreset(ip: string) {
  params.ip = ip
  fetchInfo(ip)
}
</script>

<template>
  <ToolPage>
    <div class="space-y-6">
      <UAlert
        color="info"
        variant="subtle"
        icon="i-lucide-server"
        title="The lookup runs on the server"
        description="The page starts no lookup. Press Lookup IP or My IP to start one. The server gives two attributes: the client IP address that the server sees for your connection, which My IP returns, and the reverse DNS (PTR) name. The other attributes come from the address itself: the version, the scope, the matched range with its RFC, and the decimal, hexadecimal, and binary forms."
      />

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
            v-model="params.ip"
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
          :loading="status === 'processing'"
          @click="handleLookup"
        />
      </div>

      <!-- Error Alert -->
      <ToolError
        v-if="error"
        :message="error"
      />

      <!-- Results Grid -->
      <div
        v-if="info"
        class="space-y-6"
      >
        <!-- Result actions and links to the related tools -->
        <div class="flex flex-wrap items-center gap-2">
          <ToolResultActions
            tool-id="ip-info"
            :result="info"
            filename="ip-info.json"
          />
          <UButton
            :to="cidrLink"
            size="sm"
            variant="soft"
            color="neutral"
            icon="i-lucide-network"
            label="Inspect Subnet in CIDR"
          />
          <UButton
            :to="rdapLink"
            size="sm"
            variant="soft"
            color="neutral"
            icon="i-lucide-book-open"
            label="Lookup in RDAP"
          />
        </div>

        <!-- Highlights -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="IP Version"
            :value="`IPv${info.version}`"
            color="primary"
          />
          <StatCard
            label="Address Scope"
            :value="info.type"
            :description="info.rfc"
            :color="info.type === 'public' ? 'success' : 'warning'"
          />
          <StatCard
            label="Special Address"
            :value="info.isSpecial ? 'Yes' : 'No'"
          />
          <StatCard
            label="Reverse DNS"
            :value="info.hostname || 'No PTR record'"
          />
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
              <tr class="hover:bg-elevated/20">
                <td class="p-3 font-medium text-muted">
                  Matched Range
                </td>
                <td
                  class="p-3 font-mono text-default"
                  colspan="2"
                >
                  {{ scopeEvidence }}
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

    <template #docs>
      <ToolDocs title="About IP address info">
        <div class="space-y-4 text-muted">
          <p>
            This tool shows the details of an IPv4 or IPv6 address: the class, the reverse DNS host name, and whether the address is public, private, loopback, or reserved.
          </p>
          <p>
            A private address, such as one in 10.0.0.0/8 or 192.168.0.0/16, works inside a network only. A router cannot send it over the internet. This is a common cause of a service that works on a laptop and fails in production.
          </p>
          <p>
            The reverse DNS name often names the hosting company or the internet provider of the address.
          </p>
          <p>
            The result shows the special-purpose range that holds the address and the RFC that defines the range, such as 10.0.0.0/8 from RFC 1918, 100.64.0.0/10 from RFC 6598, or 169.254.0.0/16 from RFC 3927. A public address matches no such range.
          </p>
          <p>
            The tool does not show a location. An address database gives a city at best. It does not give a building.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'CIDR Subnet Calculator', to: '/hub/network/cidr' },
            { label: 'DNS Lookup', to: '/hub/network/dns-lookup' },
            { label: 'RDAP / WHOIS Lookup', to: '/hub/network/rdap-lookup' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
