// Node 24 built-in SQLite surface used here; installed Node 20 typings predate it.
declare module 'node:sqlite' {
  type SQLValue = string | number | bigint | null | Uint8Array;
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): {
      run(...values: SQLValue[]): { changes: number | bigint; lastInsertRowid: number | bigint };
      get(...values: SQLValue[]): Record<string, SQLValue> | undefined;
      all(...values: SQLValue[]): Record<string, SQLValue>[];
    };
    close(): void;
  }
}
