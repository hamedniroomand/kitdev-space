<script setup lang="ts">
import type { FakeFieldConfig, FieldType } from '#shared/utils/data/fake-generator'

const props = defineProps<{
  typeItems: { label: string, value: FieldType }[]
  canRemove: boolean
}>()

const emit = defineEmits<{ remove: [] }>()

const field = defineModel<FakeFieldConfig>({ required: true })

const isNumeric = computed(() =>
  field.value.type === 'integer' || field.value.type === 'float' || field.value.type === 'price',
)
const isEnum = computed(() => field.value.type === 'enum')
const isDate = computed(() => field.value.type === 'date')

const enumText = computed({
  get: () => (field.value.enumValues ?? []).join(', '),
  set: (value: string) => {
    field.value = {
      ...field.value,
      enumValues: value.split(',').map(v => v.trim()).filter(Boolean),
    }
  },
})
</script>

<template>
  <div class="p-2.5 rounded-lg border border-default bg-default space-y-2">
    <div class="flex items-center justify-between gap-2">
      <UInput
        v-model="field.name"
        placeholder="Field name"
        aria-label="Field name"
        class="font-mono text-xs flex-1"
      />
      <UButton
        size="xs"
        variant="ghost"
        color="neutral"
        icon="i-lucide-trash-2"
        aria-label="Remove field"
        :disabled="!props.canRemove"
        @click="emit('remove')"
      />
    </div>

    <USelect
      v-model="field.type"
      :items="props.typeItems"
      aria-label="Field type"
      class="w-full text-xs"
    />

    <div
      v-if="isNumeric"
      class="grid grid-cols-2 gap-2"
    >
      <UInput
        v-model.number="field.min"
        type="number"
        placeholder="min"
        aria-label="Minimum value"
        class="text-xs"
      />
      <UInput
        v-model.number="field.max"
        type="number"
        placeholder="max"
        aria-label="Maximum value"
        class="text-xs"
      />
    </div>

    <UInput
      v-if="isEnum"
      v-model="enumText"
      placeholder="admin, editor, viewer"
      aria-label="Enum values, separated by commas"
      class="text-xs font-mono"
    />

    <div
      v-if="isDate"
      class="grid grid-cols-2 gap-2"
    >
      <UInput
        v-model="field.dateFrom"
        type="date"
        aria-label="Earliest date"
        class="text-xs"
      />
      <UInput
        v-model="field.dateTo"
        type="date"
        aria-label="Latest date"
        class="text-xs"
      />
    </div>

    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-1.5">
        <UInput
          v-model.number="field.nullRate"
          type="number"
          :min="0"
          :max="100"
          placeholder="0"
          aria-label="Null rate percent"
          class="text-xs w-20"
        />
        <span class="text-xs text-muted">% null</span>
      </div>
      <div class="flex items-center gap-1.5">
        <USwitch
          v-model="field.unique"
          aria-label="Unique values only"
          size="sm"
        />
        <span class="text-xs text-muted">Unique</span>
      </div>
    </div>
  </div>
</template>
