/**
 * server/db/fallback.ts
 *
 * In-memory database fallback for development environments that lack a
 * running PostgreSQL instance (i.e. no DATABASE_URL env var).
 *
 * Data is persisted to .data/db.json so it survives server restarts.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Row = Record<string, any>;

type TableName =
  | "users"
  | "income"
  | "expenses"
  | "budgets"
  | "savings_goals"
  | "recurring_expenses";

const TABLE_NAMES: TableName[] = [
  "users",
  "income",
  "expenses",
  "budgets",
  "savings_goals",
  "recurring_expenses",
];

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

const DATA_DIR = join(process.cwd(), ".data");
const DB_FILE = join(DATA_DIR, "db.json");

function loadFromDisk(): {
  tables: Record<TableName, Row[]>;
  counters: Record<TableName, number>;
} {
  try {
    if (existsSync(DB_FILE)) {
      const raw = readFileSync(DB_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch {
    // corrupt file — start fresh
  }
  const empty = {
    tables: Object.fromEntries(TABLE_NAMES.map((n) => [n, []])) as Record<TableName, Row[]>,
    counters: Object.fromEntries(TABLE_NAMES.map((n) => [n, 0])) as Record<TableName, number>,
  };
  return empty;
}

function saveToDisk(): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(
      DB_FILE,
      JSON.stringify({ tables: Object.fromEntries(tables), counters: Object.fromEntries(counters) }, null, 2),
      "utf-8"
    );
  } catch (err) {
    console.warn("[fallbackDb] Could not persist to disk:", err);
  }
}

// ---------------------------------------------------------------------------
// Module-level state (hydrated from disk on startup)
// ---------------------------------------------------------------------------

const loaded = loadFromDisk();

const tables: Map<TableName, Row[]> = new Map(
  TABLE_NAMES.map((n) => [n, loaded.tables[n] ?? []])
);

const counters: Map<TableName, number> = new Map(
  TABLE_NAMES.map((n) => [n, loaded.counters[n] ?? 0])
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTable(name: TableName): Row[] {
  return tables.get(name)!;
}

function nextId(table: TableName): number {
  const id = (counters.get(table) ?? 0) + 1;
  counters.set(table, id);
  return id;
}

function now(): string {
  return new Date().toISOString();
}

/**
 * Resolve a positional parameter placeholder ($1, $2 …) to its value in
 * `params`. Index is 1-based in PostgreSQL syntax.
 */
function resolveParam(placeholder: string, params: any[]): any {
  const idx = parseInt(placeholder.slice(1), 10) - 1;
  return params[idx];
}

/**
 * Parse the column list and VALUES list from an INSERT statement body.
 * Handles:  (col1, col2, col3) VALUES ($1, $2, $3)
 */
function parseInsert(
  sql: string,
  params: any[],
): { columns: string[]; values: any[] } {
  // Extract column names
  const colMatch = sql.match(/\(([^)]+)\)\s+VALUES/i);
  if (!colMatch) throw new Error(`[fallbackDb] Cannot parse INSERT columns: ${sql}`);
  const columns = colMatch[1].split(",").map((c) => c.trim());

  // Extract value placeholders
  const valMatch = sql.match(/VALUES\s*\(([^)]+)\)/i);
  if (!valMatch) throw new Error(`[fallbackDb] Cannot parse INSERT values: ${sql}`);
  const placeholders = valMatch[1].split(",").map((v) => v.trim());
  const values = placeholders.map((p) => {
    if (/^\$\d+$/.test(p)) return resolveParam(p, params);
    // Handle NOW() literal
    if (/^NOW\(\)$/i.test(p)) return now();
    // Unquoted string literal (e.g. 'active')
    const strMatch = p.match(/^'([^']*)'$/);
    if (strMatch) return strMatch[1];
    return p;
  });

  return { columns, values };
}

/**
 * Parse SET clause from an UPDATE statement.
 * Handles:  col1 = $1, col2 = $2, updated_at = NOW()
 */
function parseSetClause(
  setClause: string,
  params: any[],
): Record<string, any> {
  const updates: Record<string, any> = {};

  // Split on commas that are NOT inside parentheses
  const parts = setClause.split(/,(?![^(]*\))/);

  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const col = part.slice(0, eqIdx).trim();
    const rawVal = part.slice(eqIdx + 1).trim();

    if (/^\$\d+$/.test(rawVal)) {
      updates[col] = resolveParam(rawVal, params);
    } else if (/^NOW\(\)$/i.test(rawVal)) {
      updates[col] = now();
    } else {
      // String literal
      const strMatch = rawVal.match(/^'([^']*)'$/);
      updates[col] = strMatch ? strMatch[1] : rawVal;
    }
  }

  return updates;
}

/**
 * Extract the table name from a SQL fragment.
 * Works for:  ... FROM <table> ...  /  INSERT INTO <table> ...  /  UPDATE <table> ...  /  DELETE FROM <table> ...
 */
function extractTableName(sql: string): TableName | null {
  const patterns = [
    /\bFROM\s+(\w+)/i,
    /\bINSERT\s+INTO\s+(\w+)/i,
    /\bUPDATE\s+(\w+)/i,
    /\bDELETE\s+FROM\s+(\w+)/i,
  ];
  for (const pat of patterns) {
    const m = sql.match(pat);
    if (m) return m[1] as TableName;
  }
  return null;
}

/**
 * Build a simple filter function from a WHERE clause.
 * Supported conditions (AND-combined):
 *   user_id = $N
 *   id = $N
 *   email = $N
 *   month = $N
 *   year = $N
 *   status = 'active'
 *   next_run_at <= NOW()   (compared by Date)
 */
function buildFilter(whereClause: string, params: any[]): (row: Row) => boolean {
  // Split on AND (case-insensitive)
  const conditions = whereClause.split(/\bAND\b/i).map((c) => c.trim());

  return (row: Row) => {
    for (const cond of conditions) {
      // col = $N
      const paramEq = cond.match(/^(\w+)\s*=\s*(\$\d+)$/i);
      if (paramEq) {
        const col = paramEq[1];
        const val = resolveParam(paramEq[2], params);
        // Loose equality to handle numeric vs string coercion
        // eslint-disable-next-line eqeqeq
        if (row[col] != val) return false;
        continue;
      }

      // col = 'literal'
      const strEq = cond.match(/^(\w+)\s*=\s*'([^']*)'$/i);
      if (strEq) {
        const col = strEq[1];
        const val = strEq[2];
        if (row[col] !== val) return false;
        continue;
      }

      // col <= NOW()  (for next_run_at <= NOW())
      const lteNow = cond.match(/^(\w+)\s*<=\s*NOW\(\)$/i);
      if (lteNow) {
        const col = lteNow[1];
        const rowDate = new Date(row[col]);
        if (!(rowDate <= new Date())) return false;
        continue;
      }

      // col >= NOW()  (future date checks if ever needed)
      const gteNow = cond.match(/^(\w+)\s*>=\s*NOW\(\)$/i);
      if (gteNow) {
        const col = gteNow[1];
        const rowDate = new Date(row[col]);
        if (!(rowDate >= new Date())) return false;
        continue;
      }
    }
    return true;
  };
}

// ---------------------------------------------------------------------------
// SQL Dispatch
// ---------------------------------------------------------------------------

function handleBeginCommitRollback(): { rows: any[]; rowCount: number } {
  // No-op for in-memory store
  return { rows: [], rowCount: 0 };
}

function handleInsert(
  sql: string,
  params: any[],
  tableName: TableName,
): { rows: any[]; rowCount: number } {
  const { columns, values } = parseInsert(sql, params);

  const row: Row = {};
  for (let i = 0; i < columns.length; i++) {
    row[columns[i]] = values[i];
  }

  // Enforce unique email for the users table
  if (tableName === "users" && row.email) {
    const duplicate = getTable("users").find(
      (r) => r.email === row.email
    );
    if (duplicate) {
      const err: any = new Error("duplicate key value violates unique constraint");
      err.code = "23505";
      throw err;
    }
  }

  // Auto-increment id
  row.id = nextId(tableName);

  // Default timestamps if not provided by caller
  const ts = now();
  if (!("created_at" in row)) row.created_at = ts;
  if (!("updated_at" in row)) {
    // Not all tables have updated_at, but setting it is harmless
    row.updated_at = ts;
  }

  getTable(tableName).push(row);

  saveToDisk();

  const returningMatch = sql.match(/RETURNING\s+(.+)$/i);
  if (!returningMatch) {
    return { rows: [], rowCount: 1 };
  }

  if (/RETURNING\s+\*/i.test(sql)) {
    return { rows: [row], rowCount: 1 };
  }

  // RETURNING col1, col2, ... — project only the requested columns
  const cols = returningMatch[1].split(',').map((c) => c.trim());
  const projected: Row = {};
  for (const col of cols) {
    projected[col] = row[col];
  }
  return { rows: [projected], rowCount: 1 };
}

function handleSelect(
  sql: string,
  params: any[],
  tableName: TableName,
): { rows: any[]; rowCount: number } {
  let rows = [...getTable(tableName)];

  // Apply WHERE clause if present
  const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|\s+GROUP\s+BY|$)/is);
  if (whereMatch) {
    const filter = buildFilter(whereMatch[1].trim(), params);
    rows = rows.filter(filter);
  }

  // Apply ORDER BY date DESC  (the only ordering used in the service layer)
  if (/ORDER\s+BY\s+date\s+DESC/i.test(sql)) {
    rows.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return db - da;
    });
  }

  // ORDER BY year DESC, month DESC (budgets)
  if (/ORDER\s+BY\s+year\s+DESC,\s*month\s+DESC/i.test(sql)) {
    rows.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    });
  }

  // ORDER BY created_at DESC (savings goals)
  if (/ORDER\s+BY\s+created_at\s+DESC/i.test(sql)) {
    rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // ORDER BY next_run_at ASC (if ever needed)
  if (/ORDER\s+BY\s+next_run_at/i.test(sql)) {
    rows.sort((a, b) => {
      const da = new Date(a.next_run_at).getTime();
      const db = new Date(b.next_run_at).getTime();
      return da - db;
    });
  }

  return { rows, rowCount: rows.length };
}

function handleUpdate(
  sql: string,
  params: any[],
  tableName: TableName,
): { rows: any[]; rowCount: number } {
  // Extract SET clause
  const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/is);
  if (!setMatch) throw new Error(`[fallbackDb] Cannot parse UPDATE SET clause: ${sql}`);
  const updates = parseSetClause(setMatch[1], params);

  // Extract WHERE clause
  const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+RETURNING|$)/is);
  const filter = whereMatch
    ? buildFilter(whereMatch[1].trim(), params)
    : () => true;

  const tableRows = getTable(tableName);
  const updatedRows: Row[] = [];

  for (let i = 0; i < tableRows.length; i++) {
    if (filter(tableRows[i])) {
      tableRows[i] = { ...tableRows[i], ...updates };
      if (!("updated_at" in updates)) {
        tableRows[i].updated_at = now();
      }
      updatedRows.push(tableRows[i]);
    }
  }

  saveToDisk();

  const returningMatch = sql.match(/RETURNING\s+(.+)$/i);
  if (!returningMatch) {
    return { rows: [], rowCount: updatedRows.length };
  }

  if (/RETURNING\s+\*/i.test(sql)) {
    return { rows: updatedRows, rowCount: updatedRows.length };
  }

  // RETURNING col1, col2, ... — project only the requested columns
  const cols = returningMatch[1].split(',').map((c) => c.trim());
  const projected = updatedRows.map((r) => {
    const p: Row = {};
    for (const col of cols) p[col] = r[col];
    return p;
  });
  return { rows: projected, rowCount: updatedRows.length };
}

function handleDelete(
  sql: string,
  params: any[],
  tableName: TableName,
): { rows: any[]; rowCount: number } {
  // Extract WHERE clause
  const whereMatch = sql.match(/WHERE\s+(.+?)$/is);
  const filter = whereMatch
    ? buildFilter(whereMatch[1].trim(), params)
    : () => true;

  const tableRows = getTable(tableName);
  const before = tableRows.length;
  const remaining = tableRows.filter((r) => !filter(r));
  tables.set(tableName, remaining);

  saveToDisk();

  return { rows: [], rowCount: before - remaining.length };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * The fallback database object.
 * Implements the same `query` interface as `pg.Pool`.
 */
export const fallbackDb = {
  async query(
    sql: string,
    params?: any[],
  ): Promise<{ rows: any[]; rowCount: number }> {
    const p = params ?? [];
    const trimmed = sql.trim();

    // Transaction control — no-ops for the in-memory store
    if (/^(BEGIN|COMMIT|ROLLBACK)$/i.test(trimmed)) {
      return handleBeginCommitRollback();
    }

    const tableName = extractTableName(trimmed);

    if (/^\s*INSERT/i.test(trimmed)) {
      if (!tableName) throw new Error(`[fallbackDb] Could not find table name in: ${sql}`);
      return handleInsert(trimmed, p, tableName);
    }

    if (/^\s*SELECT/i.test(trimmed)) {
      if (!tableName) throw new Error(`[fallbackDb] Could not find table name in: ${sql}`);
      return handleSelect(trimmed, p, tableName);
    }

    if (/^\s*UPDATE/i.test(trimmed)) {
      if (!tableName) throw new Error(`[fallbackDb] Could not find table name in: ${sql}`);
      return handleUpdate(trimmed, p, tableName);
    }

    if (/^\s*DELETE/i.test(trimmed)) {
      if (!tableName) throw new Error(`[fallbackDb] Could not find table name in: ${sql}`);
      return handleDelete(trimmed, p, tableName);
    }

    // Unknown statement — return empty result rather than hard-crashing
    console.warn(`[fallbackDb] Unrecognised SQL statement (returning empty): ${sql}`);
    return { rows: [], rowCount: 0 };
  },
};

/**
 * migrate() no-op — schema is implicit in the in-memory store.
 * Called by server/db/index.ts on startup; must not throw.
 */
export async function migrate(): Promise<void> {
  // Nothing to do — tables are pre-initialised above.
}

/**
 * Clear all in-memory data and reset auto-increment counters.
 * Intended for use in tests only.
 */
export function clearFallbackDb(): void {
  const tableNames: TableName[] = [
    "users",
    "income",
    "expenses",
    "budgets",
    "savings_goals",
    "recurring_expenses",
  ];
  for (const name of tableNames) {
    tables.set(name, []);
    counters.set(name, 0);
  }
}
