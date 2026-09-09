<script setup lang="ts">
import type { IpClassificationType } from '#shared/utils/network/ip-classify'
import { analyzeCidr, cidrContainsIp, compareCidr } from '#shared/utils/network/cidr'

useToolSeo('cidr')

const DEFAULT_INPUT = '192.168.1.0/24'

const input = ref(DEFAULT_INPUT)

// The two extra fields go in the query string, so a link can carry them.
const options = reactive({ ip: '', compare: '' })

const { restoreInputFromHash } = useToolQuery({
  toolId: 'cidr',
  input,
  options,
  autoRestore: false,
})

// A share link keeps the block in the URL hash. A link from another tool gives
// only an address, in the `ip` query parameter. The tool then shows the block
// around that address, and the user can change the prefix length.
onMounted(() => {
  if (restoreInputFromHash() || input.value !== DEFAULT_INPUT || !options.ip) {
    return
  }
  input.value = `${options.ip}/${options.ip.includes(':') ? 64 : 24}`
})

const presets = [
  { label: 'Home LAN (/24)', value: '192.168.1.0/24' },
  { label: 'VPC Subnet (/20)', value: '10.0.0.0/20' },
  { label: 'Class B (/16)', value: '172.16.0.0/16' },
  { label: 'Point-to-Point (/31)', value: '10.255.0.0/31' },
  { label: 'Host Route (/32)', value: '1.1.1.1/32' },
  { label: 'IPv6 LAN (/64)', value: '2001:db8:abcd:12::/64' },
  { label: 'IPv6 Site (/48)', value: '2001:db8::/48' },
  { label: 'IPv6 Address (/128)', value: '2001:db8::1/128' },
]

const SCOPE_LABEL: Record<IpClassificationType, string> = {
  'public': 'Public',
  'private': 'Private',
  'loopback': 'Loopback',
  'link-local': 'Link-Local',
  'multicast': 'Multicast',
  'reserved': 'Reserved',
}

const RELATION_TEXT = {
  equal: 'The two blocks cover the same addresses.',
  contains: 'This subnet encloses the second block.',
  within: 'The second block encloses this subnet.',
  disjoint: 'The two blocks do not overlap.',
} as const

const calculation = computed(() => {
  if (!input.value.trim())
    return { data: null, error: null }
  try {
    const data = analyzeCidr(input.value)
    return { data, error: null }
  }
  catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Invalid CIDR notation.',
    }
  }
})
useLiveTool(calculation)

interface StatItem {
  label: string
  value: string | number
  color?: 'primary' | 'highlighted' | 'success' | 'warning'
}

const stats = computed<StatItem[]>(() => {
  const data = calculation.value.data
  if (!data) {
    return []
  }

  const scope: StatItem = {
    label: 'Scope',
    value: SCOPE_LABEL[data.scope],
    color: data.scope === 'public' ? 'success' : 'warning',
  }

  if (data.version === 6) {
    return [
      { label: 'Address Version', value: 'IPv6' },
      { label: 'Prefix Length', value: `/${data.prefix}`, color: 'primary' },
      { label: 'Host Bits', value: 128 - data.prefix },
      scope,
    ]
  }

  return [
    { label: 'Usable Hosts', value: data.usableHosts, color: 'primary' },
    { label: 'Total Addresses', value: data.totalHosts },
    { label: 'IP Class', value: `Class ${data.ipClass}` },
    scope,
  ]
})

interface ResultRow {
  label: string
  value: string
  description?: string
  copyable?: boolean
}

const rows = computed<ResultRow[]>(() => {
  const data = calculation.value.data
  if (!data) {
    return []
  }

  if (data.version === 6) {
    return [
      { label: 'Network Prefix', value: `${data.networkAddress}/${data.prefix}` },
      { label: 'First Address', value: data.networkAddress },
      { label: 'First Address in Full', value: data.networkAddressFull },
      { label: 'Last Address', value: data.lastAddress },
      { label: 'Last Address in Full', value: data.lastAddressFull },
      { label: 'Total Addresses', value: data.totalAddresses },
    ]
  }

  const hostNote = data.prefix === 31
    ? 'RFC 3021 point-to-point link'
    : data.prefix === 32
      ? 'Single host route'
      : undefined

  return [
    { label: 'Network Address', value: data.networkAddress },
    { label: 'Broadcast Address', value: data.broadcastAddress, description: hostNote },
    { label: 'Subnet Mask', value: data.netmask },
    { label: 'Wildcard Mask', value: data.wildcard },
    { label: 'First Usable Host', value: data.firstUsableIp, description: hostNote },
    { label: 'Last Usable Host', value: data.lastUsableIp },
    { label: 'IP in Binary', value: data.ipBinary, copyable: false },
    { label: 'Mask in Binary', value: data.maskBinary, copyable: false },
  ]
})

const ipCheck = computed(() => {
  const address = options.ip.trim()
  const data = calculation.value.data
  if (!address || !data) {
    return null
  }
  const block = `${data.networkAddress}/${data.prefix}`
  try {
    const inside = cidrContainsIp(input.value, address)
    return {
      inside,
      text: inside ? `${address} is inside ${block}.` : `${address} is outside ${block}.`,
      error: null,
    }
  }
  catch (err) {
    return {
      inside: false,
      text: null,
      error: err instanceof Error ? err.message : 'Invalid IP address.',
    }
  }
})

const overlap = computed(() => {
  const other = options.compare.trim()
  if (!other || !calculation.value.data) {
    return null
  }
  try {
    const result = compareCidr(input.value, other)
    return { ...result, text: RELATION_TEXT[result.relation], error: null }
  }
  catch (err) {
    return {
      relation: 'disjoint' as const,
      overlaps: false,
      sharedAddresses: '0',
      text: null,
      error: err instanceof Error ? err.message : 'Invalid CIDR notation.',
    }
  }
})

function handlePreset(val: string) {
  input.value = val
}
</script>

<template>
  <ToolPage>
    <div class="space-y-6">
      <!-- Presets -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-muted font-medium">Presets:</span>
          <UButton
            v-for="p in presets"
            :key="p.value"
            size="xs"
            variant="ghost"
            color="neutral"
            :label="p.label"
            @click="handlePreset(p.value)"
          />
        </div>
      </div>

      <!-- Input -->
      <UFormField
        label="IPv4 or IPv6 address with a prefix length"
        class="max-w-md"
      >
        <UInput
          v-model="input"
          placeholder="e.g. 192.168.1.0/24"
          class="font-mono text-base"
        />
      </UFormField>

      <ToolError
        v-if="calculation.error"
        :message="calculation.error"
      />

      <!-- Subnet checks -->
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField
          label="Test an IP address"
          description="Check if one address is inside the subnet."
        >
          <UInput
            v-model="options.ip"
            placeholder="e.g. 192.168.1.20"
            class="w-full font-mono"
          />
          <p
            v-if="ipCheck"
            class="mt-2 text-sm"
            :class="ipCheck.error ? 'text-error' : ipCheck.inside ? 'text-success' : 'text-muted'"
          >
            {{ ipCheck.error || ipCheck.text }}
          </p>
        </UFormField>

        <UFormField
          label="Compare with a second CIDR block"
          description="Check if the two blocks overlap or enclose each other."
        >
          <UInput
            v-model="options.compare"
            placeholder="e.g. 192.168.0.0/16"
            class="w-full font-mono"
          />
          <p
            v-if="overlap"
            class="mt-2 text-sm"
            :class="overlap.error ? 'text-error' : overlap.overlaps ? 'text-success' : 'text-muted'"
          >
            {{ overlap.error || overlap.text }}
            <span
              v-if="!overlap.error && overlap.overlaps"
              class="font-mono"
            >
              Shared addresses: {{ overlap.sharedAddresses }}
            </span>
          </p>
        </UFormField>
      </div>

      <!-- Result -->
      <div
        v-if="calculation.data"
        class="space-y-6"
      >
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            v-for="stat in stats"
            :key="stat.label"
            :label="stat.label"
            :value="stat.value"
            :color="stat.color"
          />
        </div>

        <div class="space-y-2">
          <ToolResultRow
            v-for="row in rows"
            :key="row.label"
            :label="row.label"
            :value="row.value"
            :description="row.description"
            :copyable="row.copyable !== false"
          />
        </div>

        <ToolResultActions
          :result="calculation.data"
          :input="input"
          tool-id="cidr"
          filename="cidr-subnet.json"
          :options="options"
        />
      </div>
    </div>

    <template #docs>
      <ToolDocs title="About CIDR and subnets">
        <div class="space-y-4 text-muted">
          <p>
            This tool reads a CIDR block such as 10.0.0.0/24 and gives the netmask, the network address, the broadcast address, the first and last usable address, and the host count.
          </p>
          <p>
            The prefix length states how many bits name the network. A smaller number gives a larger block. A /24 holds 256 addresses and 254 usable hosts, because the network address and the broadcast address are reserved.
          </p>
          <p>
            Use it to plan a VPC, to write a firewall rule, or to check that two subnets do not overlap.
          </p>

          <h3 class="text-highlighted font-medium">
            The /31 point-to-point prefix
          </h3>
          <p>
            A /31 block holds two addresses. In a usual subnet, the first address is the network address and the last address is the broadcast address. A /31 has no space for these two addresses.
          </p>
          <p>
            RFC 3021 gives a rule for this prefix. On a point-to-point link, the two addresses become two usable host addresses. One address goes to each end of the link. The link needs no broadcast address, because each packet has only one possible destination.
          </p>
          <p>
            This tool applies the RFC 3021 rule. A /31 block shows two usable hosts. The tool never shows a negative host count.
          </p>

          <h3 class="text-highlighted font-medium">
            The /32 host prefix
          </h3>
          <p>
            A /32 block holds one address. The mask is 255.255.255.255, and all 32 bits name the network. The network address, the broadcast address, the first host, and the last host are the same address.
          </p>
          <p>
            Use a /32 for a host route, for a loopback interface on a router, or for a firewall rule that must match one server. The IPv6 equal of a /32 host route is a /128 block.
          </p>

          <h3 class="text-highlighted font-medium">
            IPv6 blocks
          </h3>
          <p>
            Give an IPv6 block, such as 2001:db8::/48, and the tool shows the first address, the last address, and the address count. It shows each address in the short form and in the full form of 8 groups.
          </p>
          <p>
            An IPv6 block has no broadcast address and no reserved last address. All addresses in the block are usable. A /64 is the usual size for one link, and a site usually gets a /48. The tool writes the address count in full digits, because a count such as the 18,446,744,073,709,551,616 addresses of a /64 is not correct in a short form.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'IP Address Info', to: '/hub/network/ip-info' },
            { label: 'DNS Lookup', to: '/hub/network/dns-lookup' },
            { label: 'HTTP Inspector', to: '/hub/network/http-inspector' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
