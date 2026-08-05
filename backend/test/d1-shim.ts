import Database from 'better-sqlite3'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

type SQLValue = string | number | bigint | null | boolean | Uint8Array

export class BoundStatement {
  constructor(
    private stmt: Database.Statement,
    private params: SQLValue[],
  ) {}

  run(): { meta: { changes: number; last_row_id: number } } {
    const info = this.stmt.run(...(this.params as never[]))
    return { meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid) } }
  }

  all(): Promise<{ results: Record<string, unknown>[] }> {
    const rows = this.stmt.all(...(this.params as never[])) as Record<string, unknown>[]
    return Promise.resolve({ results: rows })
  }

  first(): Promise<Record<string, unknown> | null> {
    const row = this.stmt.get(...(this.params as never[])) as Record<string, unknown> | undefined
    return Promise.resolve(row ?? null)
  }

  raw(): Promise<unknown[][]> {
    const rows = this.stmt.raw().all(...(this.params as never[]))
    return Promise.resolve(rows as unknown[][])
  }
}

export class PreparedStatement {
  constructor(private stmt: Database.Statement) {}

  bind(...params: SQLValue[]): BoundStatement {
    return new BoundStatement(this.stmt, params)
  }
}

export class D1Shim {
  private db: Database.Database

  constructor(migrationsFolder?: string) {
    this.db = new Database(':memory:')
    if (migrationsFolder) this.applyMigrations(migrationsFolder)
  }

  get raw(): Database.Database {
    return this.db
  }

  private applyMigrations(folder: string) {
    const files = readdirSync(folder).filter((f) => f.endsWith('.sql')).sort()
    for (const file of files) {
      this.db.exec(readFileSync(join(folder, file), 'utf-8'))
    }
  }

  prepare(sql: string): PreparedStatement {
    return new PreparedStatement(this.db.prepare(sql))
  }

  exec(sql: string) {
    this.db.exec(sql)
  }

  batch(statements: BoundStatement[]): Promise<{ results: Record<string, unknown>[] }[]> {
    return Promise.all(statements.map((s) => s.all()))
  }
}
