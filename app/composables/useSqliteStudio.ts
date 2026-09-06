import type { QueryResult, SqlValue, TableInfo, WorkerResponse } from '~/types/sqlite'
import { rowsToCsv, rowsToJson } from '~/utils/sqlite/export'

export function useSqliteStudio() {
  const { downloadBlob, downloadText } = useDownload()
  const isReady = ref(false)
  const isExecuting = ref(false)
  const error = ref<string | null>(null)
  const tables = ref<TableInfo[]>([])
  const activeTable = ref<string | null>(null)
  const activeQuery = ref<string>('SELECT * FROM products LIMIT 100;')
  const queryResult = shallowRef<QueryResult | null>(null)
  const databaseName = ref<string>('database.sqlite')
  const databaseSizeBytes = ref<number>(0)

  let worker: Worker | null = null

  function initWorker() {
    if (worker || !import.meta.client) {
      return
    }

    worker = new Worker(new URL('../workers/sqlite.worker.ts', import.meta.url), {
      type: 'module'
    })

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data
      isExecuting.value = false

      switch (response.type) {
        case 'DB_READY':
          isReady.value = true
          tables.value = response.tables
          databaseSizeBytes.value = response.sizeBytes
          error.value = null
          if (response.tables.length > 0) {
            selectTable(response.tables[0]!.name)
          }
          break

        case 'QUERY_RESULT':
          queryResult.value = response.result
          error.value = null
          break

        case 'UPDATE_SUCCESS':
          if (activeTable.value) {
            selectTable(activeTable.value)
          }
          break

        case 'EXPORT_RESULT': {
          const blob = new Blob([response.bytes.slice().buffer], { type: 'application/x-sqlite3' })
          downloadBlob(databaseName.value || 'database.sqlite', blob)
          break
        }

        case 'ERROR':
          error.value = response.message
          break
      }
    }
  }

  async function loadDatabaseFile(file: File) {
    initWorker()
    databaseName.value = file.name
    isExecuting.value = true
    error.value = null

    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      worker?.postMessage({ type: 'INIT_DB', bytes })
    } catch {
      error.value = 'Failed to read file.'
      isExecuting.value = false
    }
  }

  function createBlankDatabase() {
    initWorker()
    databaseName.value = 'blank.sqlite'
    isExecuting.value = true
    worker?.postMessage({ type: 'INIT_DB' })
  }

  function loadSampleDatabase() {
    initWorker()
    databaseName.value = 'ecommerce-sample.sqlite'
    isExecuting.value = true
    worker?.postMessage({ type: 'LOAD_SAMPLE' })
  }

  function executeQuery(sql: string) {
    if (!worker || !sql.trim()) {
      return
    }
    isExecuting.value = true
    error.value = null
    worker.postMessage({ type: 'EXECUTE_QUERY', sql })
  }

  function selectTable(tableName: string) {
    activeTable.value = tableName
    const query = `SELECT * FROM "${tableName}" LIMIT 100;`
    activeQuery.value = query
    executeQuery(query)
  }

  function updateCell(table: string, rowid: number, column: string, value: SqlValue) {
    if (!worker) {
      return
    }
    isExecuting.value = true
    worker.postMessage({ type: 'UPDATE_CELL', table, rowid, column, value })
  }

  function downloadDatabase() {
    if (!worker) {
      return
    }
    worker.postMessage({ type: 'EXPORT_DB' })
  }

  function exportCsv() {
    if (!queryResult.value) {
      return
    }
    const csv = rowsToCsv(queryResult.value.columns, queryResult.value.rows)
    downloadText(`${activeTable.value || 'query'}.csv`, csv, 'text/csv')
  }

  function exportJson() {
    if (!queryResult.value) {
      return
    }
    const json = rowsToJson(queryResult.value.columns, queryResult.value.rows)
    downloadText(`${activeTable.value || 'query'}.json`, json, 'application/json')
  }

  function closeDatabase() {
    worker?.terminate()
    worker = null
    isReady.value = false
    tables.value = []
    activeTable.value = null
    queryResult.value = null
    error.value = null
  }

  return {
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
  }
}
