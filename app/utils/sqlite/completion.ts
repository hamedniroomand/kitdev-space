import type { Extension } from '@codemirror/state'
import type { TableInfo } from '~/types/sqlite'
import { autocompletion } from '@codemirror/autocomplete'
import { keywordCompletionSource, schemaCompletionSource, SQLite } from '@codemirror/lang-sql'

export function buildSqlSchema(tables: TableInfo[]): Record<string, string[]> {
  return Object.fromEntries(
    tables.map(table => [table.name, table.columns.map(column => column.name)]),
  )
}

/**
 * Completes a table and a column name from the schema of the open database,
 * next to the SQLite keywords. The schema is read through a getter, so a new
 * table appears without rebuilding the extension.
 */
export function sqliteCompletion(getTables: () => TableInfo[]): Extension {
  return autocompletion({
    override: [
      context => schemaCompletionSource({
        dialect: SQLite,
        schema: buildSqlSchema(getTables()),
      })(context),
      keywordCompletionSource(SQLite),
    ],
  })
}
