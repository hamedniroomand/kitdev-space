<script setup lang="ts">
import type { ColumnAlign } from '#shared/utils/dev/markdown-table'
import { formatMarkdownTable } from '#shared/utils/dev/markdown-table'

useToolSeo('markdown-table')

const headers = ref<string[]>(['Feature', 'Status', 'Notes'])
const alignments = ref<ColumnAlign[]>(['left', 'center', 'left'])
const rows = ref<string[][]>([
  ['Dark Mode', 'Done', 'Built with Tailwind'],
  ['Search', 'Active', 'Command palette Cmd+K'],
  ['Offline', 'Planned', 'Service Worker'],
])

const { copy, label, color, icon } = useCopyFeedback()

const markdownOutput = computed(() => {
  return formatMarkdownTable({
    headers: headers.value,
    alignments: alignments.value,
    rows: rows.value,
  })
})

function addColumn() {
  const index = headers.value.length + 1
  headers.value.push(`Column ${index}`)
  alignments.value.push('left')
  rows.value.forEach(row => row.push(''))
}

function removeColumn(colIndex: number) {
  if (headers.value.length <= 1)
    return
  headers.value.splice(colIndex, 1)
  alignments.value.splice(colIndex, 1)
  rows.value.forEach(row => row.splice(colIndex, 1))
}

function addRow() {
  rows.value.push(new Array(headers.value.length).fill(''))
}

function removeRow(rowIndex: number) {
  if (rows.value.length <= 1)
    return
  rows.value.splice(rowIndex, 1)
}

function handleCopy() {
  copy(markdownOutput.value)
}
</script>

<template>
  <ToolPage>
    <div class="space-y-6">
      <!-- Toolbar controls -->
      <div class="flex flex-wrap items-center justify-between gap-3 p-3 border border-default rounded-xl bg-elevated/40">
        <div class="flex items-center gap-2">
          <UButton
            size="xs"
            color="neutral"
            variant="soft"
            icon="i-lucide-plus"
            label="Add Column"
            @click="addColumn"
          />
          <UButton
            size="xs"
            color="neutral"
            variant="soft"
            icon="i-lucide-plus"
            label="Add Row"
            @click="addRow"
          />
        </div>

        <div class="flex items-center gap-2">
          <UButton
            :label="label()"
            :color="color()"
            :icon="icon()"
            size="xs"
            variant="subtle"
            @click="handleCopy"
          />
        </div>
      </div>

      <!-- Table Editor Grid -->
      <div class="overflow-x-auto border border-default rounded-xl bg-default">
        <table class="w-full text-xs border-collapse">
          <thead>
            <tr class="bg-elevated/80 border-b border-default">
              <th class="w-10 px-2 py-2 text-center text-muted font-mono">
                #
              </th>
              <th
                v-for="(header, cIndex) in headers"
                :key="cIndex"
                class="p-2 min-w-[160px] border-r border-default last:border-r-0"
              >
                <div class="space-y-1.5">
                  <div class="flex items-center gap-1">
                    <UInput
                      v-model="headers[cIndex]"
                      placeholder="Header Name"
                      size="xs"
                      class="flex-1 font-semibold"
                    />
                    <UButton
                      v-if="headers.length > 1"
                      icon="i-lucide-x"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      @click="removeColumn(cIndex)"
                    />
                  </div>
                  <!-- Alignment selector -->
                  <div class="flex items-center justify-center gap-1 bg-default rounded p-0.5 border border-default">
                    <UButton
                      size="xs"
                      :variant="alignments[cIndex] === 'left' ? 'solid' : 'ghost'"
                      color="neutral"
                      icon="i-lucide-align-left"
                      class="p-1 h-auto"
                      @click="alignments[cIndex] = 'left'"
                    />
                    <UButton
                      size="xs"
                      :variant="alignments[cIndex] === 'center' ? 'solid' : 'ghost'"
                      color="neutral"
                      icon="i-lucide-align-center"
                      class="p-1 h-auto"
                      @click="alignments[cIndex] = 'center'"
                    />
                    <UButton
                      size="xs"
                      :variant="alignments[cIndex] === 'right' ? 'solid' : 'ghost'"
                      color="neutral"
                      icon="i-lucide-align-right"
                      class="p-1 h-auto"
                      @click="alignments[cIndex] = 'right'"
                    />
                  </div>
                </div>
              </th>
              <th class="w-10" />
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr
              v-for="(row, rIndex) in rows"
              :key="rIndex"
              class="hover:bg-elevated/30"
            >
              <td class="px-2 py-1.5 text-center text-muted select-none font-mono">
                {{ rIndex + 1 }}
              </td>
              <td
                v-for="(_, cIndex) in headers"
                :key="cIndex"
                class="p-1.5 border-r border-default last:border-r-0"
              >
                <UInput
                  v-model="rows[rIndex]![cIndex]"
                  placeholder="Cell value"
                  size="xs"
                />
              </td>
              <td class="px-2 py-1.5 text-center">
                <UButton
                  v-if="rows.length > 1"
                  icon="i-lucide-trash-2"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click="removeRow(rIndex)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Formatted Markdown Output -->
      <div class="space-y-2">
        <div class="flex items-center justify-between text-xs font-medium text-muted">
          <span>Markdown Output</span>
          <UButton
            :label="label()"
            :color="color()"
            :icon="icon()"
            size="xs"
            variant="ghost"
            @click="handleCopy"
          />
        </div>
        <textarea
          :value="markdownOutput"
          readonly
          rows="7"
          class="w-full p-3 font-mono text-xs bg-elevated/40 border border-default rounded-xl text-highlighted resize-y select-all focus:outline-none"
        />
      </div>
    </div>

    <template #docs>
      <ToolDocs title="About Markdown tables">
        <div class="space-y-4 text-muted">
          <p>
            This tool builds a Markdown table from cells that you fill in. It writes the pipes and the separator row, and it aligns the columns so the source stays readable.
          </p>
          <p>
            Markdown table syntax is easy to break by hand. One missing pipe, or a separator row with the wrong column count, and the whole table renders as plain text.
          </p>
          <p>
            Set the alignment for each column with the colon marks in the separator row. Use right alignment for a number column, so the digits line up.
          </p>
        </div>
        <RelatedTools
          class="mt-8"
          :items="[
            { label: 'Markdown Studio', to: '/hub/data/markdown-studio' },
            { label: 'CSV ↔ JSON', to: '/hub/data/converters/csv-json' },
            { label: 'Table Viewer', to: '/hub/data/table-viewer' },
          ]"
        />
      </ToolDocs>
    </template>
  </ToolPage>
</template>
