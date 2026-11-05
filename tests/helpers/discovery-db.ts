import {
  DatabaseSync,
  type SQLInputValue,
  type SQLOutputValue,
} from "node:sqlite";
import { readFileSync } from "node:fs";

type RunResult = { success: true; meta: { changes: number } };
type TestStatement = {
  bind: (...values: SQLInputValue[]) => TestStatement;
  first: () => Promise<Record<string, SQLOutputValue> | null>;
  all: () => Promise<{
    results: Record<string, SQLOutputValue>[];
    success: true;
    meta: object;
  }>;
  run: () => Promise<RunResult>;
};

/** Real SQLite with the subset of D1 used by the catalogue tests. */
export function discoveryDb() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync("drizzle/0004_dynamic_catalogue.sql", "utf8"));

  function statement(sql: string, args: SQLInputValue[] = []): TestStatement {
    return {
      bind: (...values) => statement(sql, values),
      async first() {
        return sqlite.prepare(sql).get(...args) ?? null;
      },
      async all() {
        return {
          results: sqlite.prepare(sql).all(...args),
          success: true,
          meta: {},
        };
      },
      async run() {
        const result = sqlite.prepare(sql).run(...args);
        return { success: true, meta: { changes: Number(result.changes) } };
      },
    };
  }

  const db = {
    prepare: statement,
    async batch(statements: TestStatement[]) {
      sqlite.exec("BEGIN");
      try {
        const result: RunResult[] = [];
        for (const item of statements) result.push(await item.run());
        sqlite.exec("COMMIT");
        return result;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  } as unknown as D1Database;
  return { db, sqlite };
}
