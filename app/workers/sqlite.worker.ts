import type { Database } from 'sql.js'
import type { ColumnInfo, TableInfo, WorkerMessage, WorkerResponse } from '~/types/sqlite'
import initSqlJs from 'sql.js'
import { buildUpdateQuery } from '~/types/sqlite'
import { quoteIdentifier } from '~/utils/sqlite/query-builder'
import { getSampleSqlScript } from '~/utils/sqlite/sample-data'

let db: Database | null = null
let SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null

async function getSqlEngine() {
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: () => '/sql-wasm.wasm',
    })
  }
  return SQL
}

function introspectSchema(database: Database): TableInfo[] {
  const tablesResult = database.exec(
    'SELECT name FROM sqlite_master WHERE type=\'table\' AND name NOT LIKE \'sqlite_%\' ORDER BY name;',
  )

  if (!tablesResult || tablesResult.length === 0 || !tablesResult[0]?.values) {
    return []
  }

  const tableNames = tablesResult[0].values.map(row => String(row[0]))
  const tables: TableInfo[] = []

  for (const name of tableNames) {
    let rowCount = 0
    try {
      const countRes = database.exec(`SELECT COUNT(*) FROM "${name}";`)
      if (countRes.length > 0 && countRes[0]?.values?.[0]?.[0] !== undefined) {
        rowCount = Number(countRes[0].values[0][0])
      }
    }
    catch {
      rowCount = 0
    }

    const columns: ColumnInfo[] = []
    try {
      const infoRes = database.exec(`PRAGMA table_info("${name}");`)
      if (infoRes.length > 0 && infoRes[0]?.values) {
        for (const row of infoRes[0].values) {
          columns.push({
            cid: Number(row[0]),
            name: String(row[1]),
            type: String(row[2]),
            notnull: Number(row[3]),
            dflt_value: row[4],
            pk: Number(row[5]),
          })
        }
      }
    }
    catch {
      // Keep empty columns array on pragma error
    }

    let hasRowId = true
    try {
      database.exec(`SELECT rowid FROM "${name}" LIMIT 1;`)
    }
    catch {
      hasRowId = false
    }

    tables.push({ name, rowCount, columns, hasRowId })
  }

  return tables
}

function countRows(database: Database, table: string): number {
  const result = database.exec(`SELECT COUNT(*) FROM ${quoteIdentifier(table)};`)
  return Number(result[0]?.values?.[0]?.[0] ?? 0)
}

/** The columns to copy when a row is duplicated. An INTEGER PRIMARY KEY is the rowid, so it gets a new value. */
function copyableColumns(database: Database, table: string): string[] {
  const info = database.exec(`PRAGMA table_info(${quoteIdentifier(table)});`)
  return (info[0]?.values ?? [])
    .filter(row => !(Number(row[5]) === 1 && String(row[2]).toUpperCase() === 'INTEGER'))
    .map(row => String(row[1]))
}

/**
 * Inserts one row. A NOT NULL column with no default gets an empty string
 * when it holds text and a zero otherwise, so the insert works on a real
 * table and the user fills the cells afterwards.
 */
function insertBlankRow(database: Database, table: string): void {
  const info = database.exec(`PRAGMA table_info(${quoteIdentifier(table)});`)
  const required = (info[0]?.values ?? []).filter((row) => {
    const isRowidAlias = Number(row[5]) === 1 && String(row[2]).toUpperCase() === 'INTEGER'
    return Number(row[3]) === 1 && row[4] === null && !isRowidAlias
  })
  if (!required.length) {
    database.run(`INSERT INTO ${quoteIdentifier(table)} DEFAULT VALUES;`)
    return
  }
  const columns = required.map(row => quoteIdentifier(String(row[1]))).join(', ')
  const values = required.map(row => (/CHAR|CLOB|TEXT/i.test(String(row[2])) || String(row[2]) === '' ? '\'\'' : '0')).join(', ')
  database.run(`INSERT INTO ${quoteIdentifier(table)} (${columns}) VALUES (${values});`)
}

globalThis.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data

  try {
    const engine = await getSqlEngine()

    switch (message.type) {
      case 'INIT_DB': {
        if (db) {
          db.close()
        }
        db = message.bytes ? new engine.Database(message.bytes) : new engine.Database()
        const tables = introspectSchema(db)
        const sizeBytes = message.bytes ? message.bytes.byteLength : 0
        const response: WorkerResponse = { type: 'DB_READY', tables, sizeBytes }
        globalThis.postMessage(response)
        break
      }

      case 'LOAD_SAMPLE': {
        if (db) {
          db.close()
        }
        db = new engine.Database()
        db.run(getSampleSqlScript())
        const tables = introspectSchema(db)
        const exported = db.export()
        const response: WorkerResponse = { type: 'DB_READY', tables, sizeBytes: exported.byteLength }
        globalThis.postMessage(response)
        break
      }

      case 'EXECUTE_QUERY': {
        if (!db) {
          throw new Error('Database is not loaded.')
        }

        const start = performance.now()
        const results = db.exec(message.sql)
        const durationMs = Math.round(performance.now() - start)

        if (results.length === 0) {
          const response: WorkerResponse = {
            type: 'QUERY_RESULT',
            result: { columns: [], rows: [], rowCount: 0, durationMs },
          }
          globalThis.postMessage(response)
          break
        }

        const first = results[0]
        const columns = first?.columns ?? []
        const allRows = first?.values ?? []
        const totalRows = allRows.length
        const slicedRows = allRows.slice(0, 1000)

        const total = message.countSql
          ? Number(db.exec(message.countSql)[0]?.values?.[0]?.[0] ?? totalRows)
          : undefined

        const response: WorkerResponse = {
          type: 'QUERY_RESULT',
          result: { columns, rows: slicedRows, rowCount: totalRows, durationMs },
          total,
        }
        globalThis.postMessage(response)
        break
      }

      case 'INSERT_ROW': {
        if (!db) {
          throw new Error('Database is not loaded.')
        }
        insertBlankRow(db, message.table)
        const response: WorkerResponse = { type: 'MUTATION_SUCCESS', table: message.table, rowCount: countRows(db, message.table) }
        globalThis.postMessage(response)
        break
      }

      case 'DUPLICATE_ROW': {
        if (!db) {
          throw new Error('Database is not loaded.')
        }
        const table = quoteIdentifier(message.table)
        const columns = copyableColumns(db, message.table).map(quoteIdentifier).join(', ')
        if (!columns) {
          throw new Error('This table has no column to copy.')
        }
        db.run(`INSERT INTO ${table} (${columns}) SELECT ${columns} FROM ${table} WHERE rowid = :rowid;`, { ':rowid': message.rowid })
        const response: WorkerResponse = { type: 'MUTATION_SUCCESS', table: message.table, rowCount: countRows(db, message.table) }
        globalThis.postMessage(response)
        break
      }

      case 'DELETE_ROW': {
        if (!db) {
          throw new Error('Database is not loaded.')
        }
        db.run(`DELETE FROM ${quoteIdentifier(message.table)} WHERE rowid = :rowid;`, { ':rowid': message.rowid })
        const response: WorkerResponse = { type: 'MUTATION_SUCCESS', table: message.table, rowCount: countRows(db, message.table) }
        globalThis.postMessage(response)
        break
      }

      case 'TABLE_SCHEMA': {
        if (!db) {
          throw new Error('Database is not loaded.')
        }
        const result = db.exec('SELECT sql FROM sqlite_master WHERE name = :name AND sql IS NOT NULL;', { ':name': message.table })
        const sql = (result[0]?.values ?? []).map(row => `${String(row[0])};`).join('\n\n')
        const response: WorkerResponse = { type: 'SCHEMA_RESULT', table: message.table, sql }
        globalThis.postMessage(response)
        break
      }

      case 'UPDATE_CELL': {
        if (!db) {
          throw new Error('Database is not loaded.')
        }

        const query = buildUpdateQuery(message.table, message.column)
        db.run(query, { ':val': message.value, ':rowid': message.rowid })

        const response: WorkerResponse = {
          type: 'UPDATE_SUCCESS',
          table: message.table,
          rowid: message.rowid,
          column: message.column,
          value: message.value,
        }
        globalThis.postMessage(response)
        break
      }

      case 'EXPORT_DB': {
        if (!db) {
          throw new Error('Database is not loaded.')
        }
        const bytes = db.export()
        const response: WorkerResponse = { type: 'EXPORT_RESULT', bytes }
        globalThis.postMessage(response, [bytes.buffer])
        break
      }
    }
  }
  catch (error) {
    const messageText = error instanceof Error ? error.message : 'Database error occurred.'
    const response: WorkerResponse = { type: 'ERROR', message: messageText }
    globalThis.postMessage(response)
  }
}
