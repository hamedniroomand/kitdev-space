<script setup lang="ts">
useToolSeo('sqlite-studio')

const {
  isReady,
  isExecuting,
  error,
  tables,
  activeTable,
  activeQuery,
  queryResult,
  databaseName,
  databaseSizeBytes,
  loadDatabaseFile,
  createBlankDatabase,
  loadSampleDatabase,
  executeQuery,
  selectTable,
  updateCell,
  downloadDatabase,
  exportCsv,
  exportJson,
  closeDatabase
} = useSqliteStudio()
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <div
      v-if="!isReady"
      class="flex-1 overflow-y-auto"
    >
      <UContainer class="max-w-5xl py-12">
        <ToolHeader />
        <SqliteWelcome
          :loading="isExecuting"
          @load-file="loadDatabaseFile"
          @create-blank="createBlankDatabase"
          @load-sample="loadSampleDatabase"
        />
      </UContainer>
    </div>

    <template v-else>
      <SqliteToolbar
        :database-name="databaseName"
        :size-bytes="databaseSizeBytes"
        :table-count="tables.length"
        @download-db="downloadDatabase"
        @export-csv="exportCsv"
        @export-json="exportJson"
        @close="closeDatabase"
      />

      <div class="flex-1 flex overflow-hidden">
        <SqliteSidebar
          :tables="tables"
          :active-table="activeTable"
          @select-table="selectTable"
        />

        <main class="flex-1 flex flex-col overflow-hidden">
          <SqliteEditor
            v-model="activeQuery"
            :executing="isExecuting"
            :error="error"
            :duration-ms="queryResult?.durationMs"
            :row-count="queryResult?.rowCount"
            @run="executeQuery"
          />

          <SqliteGrid
            :result="queryResult"
            :active-table="activeTable"
            :can-edit="true"
            @update-cell="updateCell($event.table, $event.rowid, $event.column, $event.value)"
          />
        </main>
      </div>
    </template>
  </div>
</template>
