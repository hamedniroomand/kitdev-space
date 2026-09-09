<script setup lang="ts">
import type { UrlQueryParam } from '#shared/utils/network/url'
import { encodeQueryPart } from '#shared/utils/network/url'

const params = defineModel<UrlQueryParam[]>({ required: true })

function update(index: number, patch: Partial<UrlQueryParam>) {
  params.value = params.value.map((param, position) => (position === index ? { ...param, ...patch } : param))
}

function updateKey(index: number, key: string) {
  update(index, { key, rawKey: encodeQueryPart(key) })
}

function updateValue(index: number, value: string) {
  update(index, { value, rawValue: encodeQueryPart(value), bare: false })
}

function move(index: number, offset: number) {
  const target = index + offset
  if (target < 0 || target >= params.value.length) {
    return
  }
  const next = [...params.value]
  const [row] = next.splice(index, 1)
  next.splice(target, 0, row!)
  params.value = next
}

function remove(index: number) {
  params.value = params.value.filter((_, position) => position !== index)
}

function add() {
  params.value = [...params.value, { key: '', value: '', rawKey: '', rawValue: '', bare: false }]
}
</script>

<template>
  <div class="space-y-3">
    <div class="overflow-x-auto rounded-md border border-default">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-default">
            <th class="px-3 py-2 text-left font-medium text-highlighted">
              Key
            </th>
            <th class="px-3 py-2 text-left font-medium text-highlighted">
              Decoded value
            </th>
            <th class="px-3 py-2 text-left font-medium text-highlighted">
              Raw value
            </th>
            <th class="px-3 py-2 text-right font-medium text-highlighted">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-default">
          <tr
            v-for="(param, index) in params"
            :key="index"
          >
            <td class="px-3 py-2 align-middle">
              <UInput
                :model-value="param.key"
                size="xs"
                :aria-label="`Parameter ${index + 1} key`"
                :ui="{ base: 'font-mono' }"
                class="w-full"
                @update:model-value="updateKey(index, String($event))"
              />
            </td>
            <td class="px-3 py-2 align-middle">
              <UInput
                :model-value="param.value"
                size="xs"
                :aria-label="`Parameter ${index + 1} value`"
                :ui="{ base: 'font-mono' }"
                class="w-full"
                @update:model-value="updateValue(index, String($event))"
              />
            </td>
            <td class="max-w-40 break-all px-3 py-2 align-middle font-mono text-xs text-muted">
              {{ param.bare ? '—' : param.rawValue }}
            </td>
            <td class="px-3 py-2 align-middle">
              <div class="flex items-center justify-end gap-1">
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-arrow-up"
                  :aria-label="`Move parameter ${index + 1} up`"
                  :disabled="index === 0"
                  @click="move(index, -1)"
                />
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-arrow-down"
                  :aria-label="`Move parameter ${index + 1} down`"
                  :disabled="index === params.length - 1"
                  @click="move(index, 1)"
                />
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  :aria-label="`Remove parameter ${index + 1}`"
                  @click="remove(index)"
                />
              </div>
            </td>
          </tr>
          <tr v-if="params.length === 0">
            <td
              class="px-3 py-3 text-muted"
              colspan="4"
            >
              This URL has no query parameter.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UButton
      label="Add parameter"
      size="xs"
      color="neutral"
      variant="subtle"
      icon="i-lucide-plus"
      @click="add"
    />
  </div>
</template>
