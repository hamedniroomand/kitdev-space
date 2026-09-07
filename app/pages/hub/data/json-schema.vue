<script setup lang="ts">
import { generateSchemaFromJson, validateJsonSchema } from '#shared/utils/data/json-schema'

useToolSeo('json-schema')

const sampleSchema = JSON.stringify(
  {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      id: { type: 'integer' },
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      role: { type: 'string', enum: ['admin', 'editor', 'viewer'] },
      isActive: { type: 'boolean' },
    },
    required: ['id', 'name', 'email'],
  },
  null,
  2,
)

const sampleData = JSON.stringify(
  {
    id: 1,
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: 'admin',
    isActive: true,
  },
  null,
  2,
)

const schemaInput = ref(sampleSchema)
const dataInput = ref(sampleData)
const generateError = ref<string | null>(null)

const result = computed(() => validateJsonSchema(schemaInput.value, dataInput.value))

function handleLoadSample() {
  schemaInput.value = sampleSchema
  dataInput.value = sampleData
  generateError.value = null
}

function handleGenerateSchema() {
  generateError.value = null

  try {
    const parsed = JSON.parse(dataInput.value)
    const generated = generateSchemaFromJson(parsed)
    schemaInput.value = JSON.stringify(generated, null, 2)
  }
  catch (err) {
    generateError.value = err instanceof Error
      ? err.message
      : 'Cannot parse the JSON data to make a schema.'
  }
}

function handleClear() {
  schemaInput.value = ''
  dataInput.value = ''
  generateError.value = null
}
</script>

<template>
  <ToolPage>
    <div class="space-y-6">
      <ToolError
        v-if="generateError"
        :message="generateError"
      />

      <!-- Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <div class="flex items-center gap-2">
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="i-lucide-file-text"
            label="Load Sample"
            @click="handleLoadSample"
          />
          <UButton
            size="xs"
            variant="subtle"
            color="primary"
            icon="i-lucide-wrench"
            label="Generate Schema from Data"
            :disabled="!dataInput.trim()"
            @click="handleGenerateSchema"
          />
        </div>

        <div class="flex items-center gap-2">
          <UBadge
            v-if="result.draft && schemaInput.trim()"
            color="neutral"
            variant="subtle"
            size="md"
          >
            Draft: {{ result.draft }}
          </UBadge>

          <UBadge
            v-if="schemaInput.trim() && dataInput.trim()"
            :color="result.isValid ? 'success' : 'error'"
            variant="subtle"
            size="md"
          >
            {{ result.isValid ? 'Data is Valid' : 'Validation Failed' }}
          </UBadge>

          <UButton
            label="Clear All"
            icon="i-lucide-eraser"
            size="xs"
            color="neutral"
            variant="ghost"
            :disabled="!schemaInput && !dataInput"
            @click="handleClear"
          />
        </div>
      </div>

      <!-- Critical Schema/Data Syntax Errors -->
      <div
        v-if="result.schemaError"
        class="space-y-2"
      >
        <UAlert
          color="error"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          title="Schema Error"
          :description="result.schemaError"
        />
      </div>

      <div
        v-if="result.dataError"
        class="space-y-2"
      >
        <UAlert
          color="error"
          variant="subtle"
          icon="i-lucide-alert-triangle"
          title="Data Error"
          :description="result.dataError"
        />
      </div>

      <!-- Validation Error List -->
      <div
        v-if="!result.isValid && result.errors.length > 0"
        class="border border-error/40 bg-error/5 rounded-xl p-4 space-y-3"
      >
        <div class="flex items-center gap-2 text-error font-semibold text-sm">
          <UIcon
            name="i-lucide-alert-circle"
            class="w-4 h-4"
          />
          <span>Found {{ result.errors.length }} validation errors:</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-error/20 text-muted">
                <th class="p-2 font-medium">
                  Path
                </th>
                <th class="p-2 font-medium">
                  Rule (Keyword)
                </th>
                <th class="p-2 font-medium">
                  Message
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-error/10 font-mono">
              <tr
                v-for="(err, idx) in result.errors"
                :key="idx"
                class="hover:bg-error/10"
              >
                <td class="p-2 font-bold text-default">
                  {{ err.path }}
                </td>
                <td class="p-2 text-warning">
                  {{ err.keyword }}
                </td>
                <td class="p-2 font-sans text-muted">
                  {{ err.message }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Success Banner -->
      <div
        v-if="result.isValid && schemaInput.trim() && dataInput.trim()"
        class="p-3 border border-success/30 bg-success/10 rounded-xl flex items-center gap-2 text-success text-sm"
      >
        <UIcon
          name="i-lucide-check-circle"
          class="w-4 h-4"
        />
        <span>Data successfully matches the provided JSON Schema.</span>
      </div>

      <!-- Dual Editors -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LazyToolEditor
          v-model="schemaInput"
          hydrate-on-idle
          label="JSON Schema"
          lang="json"
          :rows="18"
          placeholder="Paste JSON Schema definition here..."
        />

        <LazyToolEditor
          v-model="dataInput"
          hydrate-on-idle
          label="JSON Data"
          lang="json"
          :rows="18"
          placeholder="Paste JSON payload to validate here..."
        />
      </div>
    </div>

    <template #docs>
      <ToolDocs title="About JSON Schema">
        <div class="space-y-4 text-muted">
          <p>
            A JSON Schema states the shape of a JSON document: which fields are necessary, the type of each field, and the permitted values. This tool checks a document against a schema and names the path of each error.
          </p>
          <p>
            Select Generate schema to make a first schema from your data. The tool reads the types of the fields and marks the top-level fields as required. Then correct the result by hand.
          </p>
          <p>
            Use a schema to check an API response, a configuration file, or a form. The error path, such as user.address.zip, tells you where the problem is in a large document.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'JSON Formatter', to: '/hub/data/json-formatter' },
            { label: 'JSON → TypeScript', to: '/hub/data/json-to-typescript' },
            { label: 'Fake Data Generator', to: '/hub/data/fake-generator' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
