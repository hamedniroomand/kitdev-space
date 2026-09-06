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
  <div class="h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
    <SqliteWelcome
      v-if="!isReady"
      :loading="isExecuting"
      @load-file="loadDatabaseFile"
      @create-blank="createBlankDatabase"
      @load-sample="loadSampleDatabase"
    />

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
